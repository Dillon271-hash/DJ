// Log dates are stored as local calendar dates ("2026-03-21"), so parse
// them as local midnight — not UTC, which can show the previous day.
function parse(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatShortDate(iso: string): string {
  const d = parse(iso);
  return d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : iso;
}

export function formatLongDate(iso: string): string {
  const d = parse(iso);
  return d ? d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : iso;
}

/** "just now", "5m", "3h", "2d", then a short date. */
export function timeAgo(ms: number): string {
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
