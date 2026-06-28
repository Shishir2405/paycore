/**
 * Turn an ExportResult into a downloadable web Response with the correct
 * Content-Type and a Content-Disposition that names the file. Route handlers
 * can `return toDownloadResponse(result, 'payroll-june')` directly.
 */
import type { ExportResult } from './exporter';

/** Strip unsafe characters from a user-supplied filename stem. */
function safeStem(name: string): string {
  const stem = name.replace(/\.[a-z0-9]+$/i, '');
  return (
    stem
      .normalize('NFKD')
      .replace(/[^\w.-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || 'export'
  );
}

/**
 * Build a Response from an export result. `filename` may include or omit the
 * extension; the extension from the result is always applied.
 */
export function toDownloadResponse(result: ExportResult, filename: string): Response {
  const stem = safeStem(filename);
  const fullName = `${stem}.${result.ext}`;

  const body: BodyInit =
    typeof result.body === 'string' ? result.body : new Uint8Array(result.body);

  const headers = new Headers({
    'Content-Type': result.mime,
    'Content-Disposition': `attachment; filename="${fullName}"; filename*=UTF-8''${encodeURIComponent(fullName)}`,
    'Cache-Control': 'no-store',
  });

  if (typeof result.body !== 'string') {
    headers.set('Content-Length', String(result.body.byteLength));
  }

  return new Response(body, { status: 200, headers });
}
