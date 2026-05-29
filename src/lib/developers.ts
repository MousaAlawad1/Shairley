// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/lib/developers.ts
// PURPOSE: Recognise official Shairley developer accounts based on a build-time
//          env var. Used to render the premium "Shairley Owner" badge.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * VITE_DEVELOPER_EMAILS — comma-separated list of developer emails.
 * Set this in the Vercel project (Settings → Environment Variables).
 *
 * Example:
 *   VITE_DEVELOPER_EMAILS=mousa@example.com,abdulmuin@example.com
 *
 * Notes:
 *  • Case-insensitive comparison.
 *  • Leading / trailing whitespace per entry is ignored.
 *  • Empty / missing var → no one is treated as a developer.
 *  • Falls back gracefully in local dev when the var isn't set.
 */
const RAW = (import.meta.env.VITE_DEVELOPER_EMAILS ?? '') as string;

const DEVELOPER_EMAILS: ReadonlySet<string> = new Set(
  RAW.split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean),
);

/**
 * Returns true when the given email belongs to an official Shairley developer.
 * Safe for null / undefined / non-string input.
 */
export function isDeveloperEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  return DEVELOPER_EMAILS.has(email.trim().toLowerCase());
}

/**
 * Optional helper: expose the count of registered developer emails
 * (useful for debug / sanity checks; never expose the list itself).
 */
export function getDeveloperEmailCount(): number {
  return DEVELOPER_EMAILS.size;
}
