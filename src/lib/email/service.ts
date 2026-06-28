/**
 * EmailService — the single entry point the rest of the app uses to send mail.
 *
 * It reads the company's Settings document AT SEND-TIME (including the encrypted
 * credential columns, which are `select:false`), instantiates the provider the
 * admin selected (Gmail or Brevo), and delegates. Failures are logged but never
 * thrown into the caller's request path — a payslip run shouldn't 500 because an
 * email bounced.
 */
import { Settings, type SettingsDoc } from '@/models/Settings';
import { GmailSmtpProvider } from './gmail';
import { BrevoProvider } from './brevo';
import type { EmailMessage, EmailProvider, EmailSendResult, EmailFrom } from './types';

/** Load the settings doc WITH the encrypted credential fields included. */
async function loadSettings(companyId: string): Promise<SettingsDoc | null> {
  return Settings.findOne({ companyId, isDeleted: false })
    .select('+email.gmail.appPasswordEnc +email.brevo.apiKeyEnc')
    .lean<SettingsDoc>()
    .exec();
}

function buildProvider(settings: SettingsDoc): EmailProvider | { error: string } {
  const email = settings.email;
  const from: EmailFrom = { name: email.fromName, email: email.fromEmail };

  if (email.activeProvider === 'brevo') {
    if (!email.brevo?.apiKeyEnc) return { error: 'Brevo API key is not configured' };
    return new BrevoProvider({ apiKeyEnc: email.brevo.apiKeyEnc, from });
  }

  // Default: Gmail SMTP.
  if (!email.gmail?.user || !email.gmail?.appPasswordEnc) {
    return { error: 'Gmail credentials are not configured' };
  }
  return new GmailSmtpProvider({
    user: email.gmail.user,
    appPasswordEnc: email.gmail.appPasswordEnc,
    from,
  });
}

export const emailService = {
  /** Send a message using whichever provider the company has activated. */
  async send(companyId: string, message: EmailMessage): Promise<EmailSendResult> {
    const settings = await loadSettings(companyId);
    if (!settings) {
      return { ok: false, provider: 'none', error: 'Email is not configured for this company' };
    }

    const provider = buildProvider(settings);
    if ('error' in provider) {
      return { ok: false, provider: settings.email.activeProvider, error: provider.error };
    }

    const result = await provider.send(message);
    if (!result.ok) {
      console.error(`[email] send failed via ${result.provider}:`, result.error);
    }
    return result;
  },

  /** Fire a quick self-test email to verify the active provider works. */
  async sendTest(companyId: string, to: string): Promise<EmailSendResult> {
    return this.send(companyId, {
      to,
      subject: 'PayCore — test email',
      html: `<div style="font-family:system-ui,sans-serif;font-size:14px;color:#0f172a">
        <p>This is a test email from <strong>PayCore</strong>.</p>
        <p>If you received this, your email provider is configured correctly.</p>
      </div>`,
      text: 'This is a test email from PayCore. Your provider is configured correctly.',
    });
  },
};
