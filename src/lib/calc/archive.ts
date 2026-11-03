// Archived plans are deleted for good by a nightly job once they've been archived this long
// (supabase/migrations/20261106000001_archive_purge.sql).
export const ARCHIVE_RETENTION_DAYS = 30;

const DAY_MS = 86_400_000;

// Whole days left before an archived plan is deleted, rounded up; 0 once it's due. Clamped to
// the retention, so a "now" that lags behind (the UI rounds it to the hour) can't show 31.
export function daysUntilPurge(archivedAt: string, now: Date): number {
  const purgeAt = new Date(archivedAt).getTime() + ARCHIVE_RETENTION_DAYS * DAY_MS;
  const days = Math.ceil((purgeAt - now.getTime()) / DAY_MS);
  return Math.min(ARCHIVE_RETENTION_DAYS, Math.max(0, days));
}
