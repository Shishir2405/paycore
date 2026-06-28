/**
 * Minimal className combiner — joins truthy values, no external dependency.
 * Components keep class lists conflict-free so we don't need tailwind-merge.
 */
export type ClassValue = string | number | false | null | undefined | ClassValue[];

export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const v of values) {
    if (!v) continue;
    if (Array.isArray(v)) out.push(cn(...v));
    else out.push(String(v));
  }
  return out.join(' ');
}
