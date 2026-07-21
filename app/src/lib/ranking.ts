import { BUCKET_RANGE, type Bucket, type SetLog } from "./types";

export const MAX_COMPARISONS = 3;

export function bucketRange(bucket: Bucket): [number, number] {
  return BUCKET_RANGE[bucket];
}

/** Which bucket a raw score falls into, e.g. for deriving a display
 * color from an averaged score that was never itself run through the
 * comparison flow. */
export function bucketForScore(score: number): Bucket {
  if (score >= BUCKET_RANGE.loved[0]) return "loved";
  if (score >= BUCKET_RANGE.good[0]) return "good";
  return "not";
}

/** Pick the existing entry (within the same bucket) whose score is closest
 * to the midpoint of the current search range — the next best comparison
 * to halve the range, same idea as a binary-search probe. Generic over
 * anything with an id/score, so the same engine drives both artist-set
 * scoring and venue scoring. */
export function pickComparisonTarget<T extends { id: string; score: number }>(
  candidates: T[],
  lo: number,
  hi: number,
  excludeIds: ReadonlySet<string>,
): T | null {
  const pool = candidates.filter((c) => !excludeIds.has(c.id));
  if (pool.length === 0) return null;
  const mid = (lo + hi) / 2;
  return pool.reduce((best, c) =>
    Math.abs(c.score - mid) < Math.abs(best.score - mid) ? c : best,
  );
}

/** Narrow the score range given the user's "which was better" answer. */
export function narrowRange(
  lo: number,
  hi: number,
  target: { score: number },
  newSetWasBetter: boolean,
): [number, number] {
  return newSetWasBetter ? [target.score, hi] : [lo, target.score];
}

/** Collapse the final [lo, hi] range to a single score, nudged off any
 * score already in use so every log keeps a distinct rank position. */
export function finalizeScore(lo: number, hi: number, existingScores: number[]): number {
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const taken = new Set(existingScores.map(round1));
  const base = round1((lo + hi) / 2);
  if (!taken.has(base)) return clamp(base, lo, hi);

  for (let step = 1; step <= 20; step++) {
    const up = round1(base + step * 0.1);
    const down = round1(base - step * 0.1);
    if (up <= hi && !taken.has(up)) return up;
    if (down >= lo && !taken.has(down)) return down;
  }
  return clamp(base, lo, hi);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

const BUCKET_ORDER: Record<Bucket, number> = { loved: 0, good: 1, not: 2 };

export function sortLogs(logs: SetLog[]): SetLog[] {
  return [...logs].sort((a, b) => {
    const bucketDiff = BUCKET_ORDER[a.bucket] - BUCKET_ORDER[b.bucket];
    if (bucketDiff !== 0) return bucketDiff;
    return b.score - a.score;
  });
}

export function rankInBucket(logs: SetLog[], bucket: Bucket, logId: string): number {
  const inBucket = logs.filter((l) => l.bucket === bucket).sort((a, b) => b.score - a.score);
  return inBucket.findIndex((l) => l.id === logId) + 1;
}

export function overallRank(logs: SetLog[], logId: string): number {
  return sortLogs(logs).findIndex((l) => l.id === logId) + 1;
}

/** Logs that have gone through venue rating — the pool venue comparisons
 * and venue rankings draw from. Older logs from before venue rating
 * shipped are excluded since they never got a venueBucket/venueScore. */
export function venueRatedLogs(logs: SetLog[]): (SetLog & { venueBucket: Bucket; venueScore: number })[] {
  return logs.filter(
    (l): l is SetLog & { venueBucket: Bucket; venueScore: number } =>
      l.venueBucket !== undefined && l.venueScore !== undefined,
  );
}

export function sortByVenue(logs: SetLog[]): SetLog[] {
  const rated = venueRatedLogs(logs);
  return [...rated].sort((a, b) => {
    const bucketDiff = BUCKET_ORDER[a.venueBucket] - BUCKET_ORDER[b.venueBucket];
    if (bucketDiff !== 0) return bucketDiff;
    return b.venueScore - a.venueScore;
  });
}

export function venueRankInBucket(logs: SetLog[], bucket: Bucket, logId: string): number {
  const inBucket = venueRatedLogs(logs)
    .filter((l) => l.venueBucket === bucket)
    .sort((a, b) => b.venueScore - a.venueScore);
  return inBucket.findIndex((l) => l.id === logId) + 1;
}
