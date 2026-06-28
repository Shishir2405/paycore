/**
 * Gmail SMTP provider via nodemailer. The app password is stored encrypted in
 * Settings.email.gmail.appPasswordEnc and decrypted here at send-time only —
 * never returned to the client.
 */
import nodemailer from 'nodemailer';
import { decryptField } from '@/lib/utils/crypto';
import type { EmailProvider, EmailMessage, EmailSendResult, EmailFrom } from './types';

export type GmailConfig = {
  user: string;
  /** Encrypted app password (v1:...). */
  appPasswordEnc: string;
  from: EmailFrom;
};

export class GmailSmtpProvider implements EmailProvider {
  readonly key = 'gmail';

  constructor(private readonly config: GmailConfig) {}

  private transport() {
    const pass = this.config.appPasswordEnc ? decryptField(this.config.appPasswordEnc) : '';
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: this.config.user, pass },
    });
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (!this.config.user || !this.config.appPasswordEnc) {
      return { ok: false, provider: this.key, error: 'Gmail credentials are not configured' };
    }
    try {
      const info = await this.transport().sendMail({
        from: `${this.config.from.name} <${this.config.from.email || this.config.user}>`,
        to: Array.isArray(message.to) ? message.to.join(', ') : message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments: message.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      });
      return { ok: true, provider: this.key, messageId: info.messageId };
    } catch (err) {
      return { ok: false, provider: this.key, error: err instanceof Error ? err.message : 'SMTP send failed' };
    }
  }
}
