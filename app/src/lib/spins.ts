import type { SetLog } from "./types";

// Spins: Disko's points. Keep in sync with the spins_board view in
// supabase/schema.sql, which computes the same thing for the Charts.
export const SPINS = {
  perSet: 10,
  note: 5,
  media: 5,
  newArtist: 5,
} as const;

export function spinsFor(logs: SetLog[]): number {
  let total = 0;
  const artists = new Set<string>();
  for (const l of logs) {
    total += SPINS.perSet;
    if (l.note?.trim()) total += SPINS.note;
    if (l.mediaPaths?.length) total += SPINS.media;
    artists.add(l.artist.trim().toLowerCase());
  }
  return total + artists.size * SPINS.newArtist;
}

/** What one new set earned, given everything logged before it. */
export function spinsEarned(log: SetLog, before: SetLog[]): { total: number; parts: string[] } {
  const parts = [`+${SPINS.perSet} set`];
  let total: number = SPINS.perSet;
  if (log.note?.trim()) {
    total += SPINS.note;
    parts.push(`+${SPINS.note} notes`);
  }
  if (log.mediaPaths?.length) {
    total += SPINS.media;
    parts.push(`+${SPINS.media} photos`);
  }
  const key = log.artist.trim().toLowerCase();
  if (!before.some((l) => l.id !== log.id && l.artist.trim().toLowerCase() === key)) {
    total += SPINS.newArtist;
    parts.push(`+${SPINS.newArtist} new artist`);
  }
  return { total, parts };
}

// Tiers, named for where you'd be on a lineup.
export const TIERS = [
  { name: "Opener", min: 0 },
  { name: "Warm-up", min: 100 },
  { name: "Peak Time", min: 300 },
  { name: "Headliner", min: 700 },
  { name: "Legend", min: 1500 },
] as const;

export function tierFor(spins: number) {
  let i = 0;
  while (i + 1 < TIERS.length && spins >= TIERS[i + 1].min) i++;
  const tier = TIERS[i];
  const next = TIERS[i + 1] ?? null;
  const progress = next ? (spins - tier.min) / (next.min - tier.min) : 1;
  return { tier, next, progress, index: i };
}
