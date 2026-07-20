import { BUCKET_RANGE, type Bucket, type SetLog } from "./types";

export const MAX_COMPARISONS = 3;

export function bucketRange(bucket: Bucket): [number, number] {
  return BUCKET_RANGE[bucket];
}

/** Pick the existing log (within the same bucket) whose score is closest to
 * the midpoint of the current search range — the next best comparison to
 * halve the range, same idea as a binary-search probe. */
export function pickComparisonTarget(
  candidates: SetLog[],
  lo: number,
  hi: number,
  excludeIds: ReadonlySet<string>,
): SetLog | null {
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
  target: SetLog,
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
