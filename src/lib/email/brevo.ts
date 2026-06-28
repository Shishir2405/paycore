/**
 * Brevo (Sendinblue) transactional email provider. Uses the REST API over fetch
 * so there's no SDK dependency. The API key is stored encrypted in
 * Settings.email.brevo.apiKeyEnc and decrypted at send-time.
 */
import { decryptField } from '@/lib/utils/crypto';
import type { EmailProvider, EmailMessage, EmailSendResult, EmailFrom } from './types';

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

export type BrevoConfig = {
  /** Encrypted API key (v1:...). */
  apiKeyEnc: string;
  from: EmailFrom;
};

export class BrevoProvider implements EmailProvider {
  readonly key = 'brevo';

  constructor(private readonly config: BrevoConfig) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (!this.config.apiKeyEnc) {
      return { ok: false, provider: this.key, error: 'Brevo API key is not configured' };
    }

    const recipients = (Array.isArray(message.to) ? message.to : [message.to]).map((email) => ({ email }));

    try {
      const res = await fetch(BREVO_ENDPOINT, {
        method: 'POST',
        headers: {
          'api-key': decryptField(this.config.apiKeyEnc),
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: this.config.from.name, email: this.config.from.email },
          to: recipients,
          subject: message.subject,
          htmlContent: message.html,
          textContent: message.text,
          attachment: message.attachments?.map((a) => ({
            name: a.filename,
            content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : a.content,
          })),
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        return { ok: false, provider: this.key, error: body?.message ?? `Brevo responded ${res.status}` };
      }

      const body = (await res.json().catch(() => ({}))) as { messageId?: string };
      return { ok: true, provider: this.key, messageId: body.messageId };
    } catch (err) {
      return { ok: false, provider: this.key, error: err instanceof Error ? err.message : 'Brevo send failed' };
    }
  }
}
