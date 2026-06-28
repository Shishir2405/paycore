/**
 * Provider-agnostic email contract. Each concrete provider (Gmail SMTP, Brevo)
 * implements `send`; the EmailService picks the active one at send-time from the
 * company's Settings document — so an admin can switch providers with no redeploy.
 */

export type EmailAttachment = {
  filename: string;
  /** Raw content (Buffer) or base64 string. */
  content: Buffer | string;
  contentType?: string;
};

export type EmailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
};

export type EmailSendResult = {
  ok: boolean;
  provider: string;
  /** Provider message id when available. */
  messageId?: string;
  error?: string;
};

/** Identity used in the From header — sourced from Settings.email. */
export type EmailFrom = { name: string; email: string };

export interface EmailProvider {
  /** Stable key matching Settings.email.activeProvider. */
  readonly key: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}
