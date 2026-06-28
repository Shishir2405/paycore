/**
 * Biometric device webhook (STUB).
 *
 * Devices POST raw punch events here as JSON, e.g.:
 *   { "deviceId": "DEV-01", "punches": [
 *       { "employeeCode": "EMP-0001", "timestamp": "2026-06-28T09:02:00Z", "direction": "in" }
 *   ] }
 *
 * TODO: authenticate the device (shared secret / HMAC signature header), buffer
 * punches per employee+day, pair in/out punches, then call
 * attendanceService.upsert(...) with source='Biometric'. For now we only
 * acknowledge receipt so device integrations can be wired up end-to-end without
 * mutating attendance. Public route — biometric devices cannot carry a user
 * session; signature verification (above) is the auth boundary.
 */
import { withPublicRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { AppError } from '@/lib/utils/errors';

export const runtime = 'nodejs';

type Punch = {
  employeeCode?: string;
  timestamp?: string;
  direction?: 'in' | 'out';
};

type WebhookPayload = {
  deviceId?: string;
  punches?: Punch[];
};

export const POST = withPublicRoute(async ({ req }) => {
  let payload: WebhookPayload;
  try {
    payload = (await req.json()) as WebhookPayload;
  } catch {
    throw AppError.badRequest('Body must be valid JSON');
  }

  const punches = Array.isArray(payload.punches) ? payload.punches : [];

  // TODO: verify device signature, resolve company + employees, and upsert
  // attendance via attendanceService. Acknowledge only for now.
  return ok({
    received: punches.length,
    deviceId: payload.deviceId ?? null,
    processed: 0,
    note: 'Biometric webhook stub — punches acknowledged but not yet persisted.',
  });
});
