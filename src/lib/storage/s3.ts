/**
 * S3 / Cloudflare R2 object storage client.
 *
 * Reads configuration from the environment (kept outside the validated `env`
 * config since storage is optional infra):
 *   S3_ENDPOINT          – e.g. https://<acct>.r2.cloudflarestorage.com (R2) or
 *                          empty for AWS S3 (region-derived endpoint is used)
 *   S3_REGION            – e.g. "auto" for R2, "ap-south-1" for AWS
 *   S3_BUCKET            – target bucket name
 *   S3_ACCESS_KEY_ID
 *   S3_SECRET_ACCESS_KEY
 *
 * Exposes a tiny, presigned-URL-capable surface used by the payslips/reports
 * module. Presigned GET URLs are constructed manually with SigV4 (Node crypto)
 * so we don't depend on @aws-sdk/s3-request-presigner being installed.
 */
import crypto from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { AppError } from '@/lib/utils/errors';

type S3Config = {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

/** Read + validate storage env. Returns null when not fully configured. */
function readConfig(): S3Config | null {
  const region = process.env.S3_REGION;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!region || !bucket || !accessKeyId || !secretAccessKey) return null;
  return {
    endpoint: process.env.S3_ENDPOINT || undefined,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
  };
}

/** True when all required storage env vars are present. */
export function isConfigured(): boolean {
  return readConfig() !== null;
}

function requireConfig(): S3Config {
  const cfg = readConfig();
  if (!cfg) {
    throw AppError.internal(
      'Object storage is not configured. Set S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.',
    );
  }
  return cfg;
}

let cached: { client: S3Client; cfg: S3Config } | null = null;

function client(): { client: S3Client; cfg: S3Config } {
  const cfg = requireConfig();
  if (cached && cached.cfg === cfg) return cached;
  const c = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    // R2 and most S3-compatible providers require path-style addressing.
    forcePathStyle: Boolean(cfg.endpoint),
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
  cached = { client: c, cfg };
  return cached;
}

/** Upload bytes under `key`. Returns the stored key. */
export async function putObject(
  key: string,
  bytes: Uint8Array | Buffer,
  contentType: string,
): Promise<string> {
  const { client: c, cfg } = client();
  await c.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: bytes,
      ContentType: contentType,
    }),
  );
  return key;
}

/** Delete an object. No-op-safe: a missing key still resolves. */
export async function deleteObject(key: string): Promise<void> {
  const { client: c, cfg } = client();
  await c.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
}

// ---------------------------------------------------------------------------
// SigV4 presigned GET URL (manual — no presigner dependency)
// ---------------------------------------------------------------------------

function hmac(key: crypto.BinaryLike, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256Hex(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

/** RFC-3986 encode a single path segment, leaving '/' for the caller to join. */
function encodeSegment(segment: string): string {
  return encodeURIComponent(segment).replace(
    /[!'()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

/** Resolve the host + base URL for a bucket/key from config. */
function resolveEndpoint(cfg: S3Config, key: string): { host: string; url: URL } {
  const encodedKey = key.split('/').map(encodeSegment).join('/');
  if (cfg.endpoint) {
    // Path-style: <endpoint>/<bucket>/<key>
    const base = cfg.endpoint.replace(/\/+$/, '');
    const url = new URL(`${base}/${cfg.bucket}/${encodedKey}`);
    return { host: url.host, url };
  }
  // Virtual-hosted AWS style: https://<bucket>.s3.<region>.amazonaws.com/<key>
  const host = `${cfg.bucket}.s3.${cfg.region}.amazonaws.com`;
  const url = new URL(`https://${host}/${encodedKey}`);
  return { host, url };
}

/**
 * Build a time-limited presigned GET URL for downloading an object.
 * Implements AWS Signature V4 "query" signing (X-Amz-* params).
 */
export function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 900,
): string {
  const cfg = requireConfig();
  const expires = Math.min(Math.max(1, Math.floor(expiresInSeconds)), 604800);

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8); // YYYYMMDD
  const service = 's3';
  const credentialScope = `${dateStamp}/${cfg.region}/${service}/aws4_request`;

  const { host, url } = resolveEndpoint(cfg, key);

  const query: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${cfg.accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': 'host',
  };

  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${encodeSegment(k)}=${encodeSegment(query[k])}`)
    .join('&');

  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  const payloadHash = 'UNSIGNED-PAYLOAD';

  const canonicalRequest = [
    'GET',
    url.pathname,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = hmac(`AWS4${cfg.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, cfg.region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto
    .createHmac('sha256', kSigning)
    .update(stringToSign, 'utf8')
    .digest('hex');

  return `${url.origin}${url.pathname}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
