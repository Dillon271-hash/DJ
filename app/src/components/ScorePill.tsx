import type { Bucket } from "../lib/types";

export function ScorePill({ score, bucket }: { score: number; bucket: Bucket }) {
  return <span className={`pill ${bucket}`}>{score.toFixed(1)}</span>;
}
