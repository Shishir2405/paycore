/**
 * Provider-agnostic SMS contract. Mirrors the email abstraction so the active
 * provider can be switched from Settings at runtime. Msg91 is the first
 * implementation; Twilio can slot in behind the same interface later.
 */
export type SmsMessage = {
  to: string | string[];
  /** Plain-text body (or DLT-approved template content for India). */
  body: string;
};

export type SmsSendResult = {
  ok: boolean;
  provider: string;
  messageId?: string;
  error?: string;
};

export interface SmsProvider {
  readonly key: string;
  send(message: SmsMessage): Promise<SmsSendResult>;
}
