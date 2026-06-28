/**
 * SmsService — reads the company's Settings at send-time and dispatches via the
 * active SMS provider. Msg91 is implemented against its transactional REST API;
 * if SMS is disabled or unconfigured the call short-circuits rather than throws.
 *
 * Like EmailService, failures are logged and returned, never thrown.
 */
import { Settings, type SettingsDoc } from '@/models/Settings';
import { decryptField } from '@/lib/utils/crypto';
import type { SmsMessage, SmsProvider, SmsSendResult } from './types';

const MSG91_ENDPOINT = 'https://control.msg91.com/api/v5/flow/';

/** Msg91 transactional SMS provider (DLT-compliant, India). */
class Msg91Provider implements SmsProvider {
  readonly key = 'msg91';

  constructor(
    private readonly config: { apiKeyEnc: string; senderId: string },
  ) {}

  async send(message: SmsMessage): Promise<SmsSendResult> {
    if (!this.config.apiKeyEnc) {
      return { ok: false, provider: this.key, error: 'Msg91 API key is not configured' };
    }
    const recipients = Array.isArray(message.to) ? message.to : [message.to];

    try {
      const res = await fetch(MSG91_ENDPOINT, {
        method: 'POST',
        headers: {
          authkey: decryptField(this.config.apiKeyEnc),
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: this.config.senderId,
          // NOTE: Msg91's v5 flow API expects a pre-approved template_id + vars.
          // Sending raw body is a stub for non-DLT/dev use; production should map
          // NotificationTemplate events → approved template ids. (TODO)
          short_url: '0',
          recipients: recipients.map((mobiles) => ({ mobiles, message: message.body })),
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { ok: false, provider: this.key, error: `Msg91 error ${res.status}: ${body.slice(0, 160)}` };
      }
      const json = (await res.json().catch(() => ({}))) as { request_id?: string };
      return { ok: true, provider: this.key, messageId: json.request_id };
    } catch (err) {
      return { ok: false, provider: this.key, error: err instanceof Error ? err.message : 'Msg91 send failed' };
    }
  }
}

async function loadSettings(companyId: string): Promise<SettingsDoc | null> {
  return Settings.findOne({ companyId, isDeleted: false })
    .select('+sms.msg91.apiKeyEnc +sms.twilio.accountSidEnc +sms.twilio.authTokenEnc')
    .lean<SettingsDoc>()
    .exec();
}

export const smsService = {
  async send(companyId: string, message: SmsMessage): Promise<SmsSendResult> {
    const settings = await loadSettings(companyId);
    if (!settings) {
      return { ok: false, provider: 'none', error: 'SMS is not configured for this company' };
    }
    if (!settings.sms.enabled) {
      return { ok: false, provider: settings.sms.activeProvider, error: 'SMS is disabled' };
    }

    // Only Msg91 is implemented today; Twilio is a future provider behind the
    // same interface. (TODO: TwilioProvider)
    if (settings.sms.activeProvider !== 'msg91') {
      return { ok: false, provider: settings.sms.activeProvider, error: 'Provider not implemented yet' };
    }

    const provider = new Msg91Provider({
      apiKeyEnc: settings.sms.msg91?.apiKeyEnc ?? '',
      senderId: settings.sms.msg91?.senderId ?? '',
    });
    const result = await provider.send(message);
    if (!result.ok) console.error(`[sms] send failed via ${result.provider}:`, result.error);
    return result;
  },
};
