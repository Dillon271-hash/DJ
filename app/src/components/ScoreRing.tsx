import type { Bucket } from "../lib/types";

export function ScoreRing({ score, bucket }: { score: number; bucket: Bucket }) {
  return (
    <span className={`score-ring ${bucket}`}>
      <span>{score.toFixed(1)}</span>
    </span>
  );
}
