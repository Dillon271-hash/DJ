import type { ScoreSummary } from "../lib/predict";
import { bucketForScore } from "../lib/ranking";

// Disko score · For you · Friends — side by side on artist/venue pages.
export function ScoreTrio({ summary, loading }: { summary: ScoreSummary | null; loading: boolean }) {
  const s = summary;
  return (
    <div className="score-trio">
      <Tile
        label="Disko score"
        score={s?.disko?.score}
        sub={s?.disko ? `${s.disko.count} rating${s.disko.count === 1 ? "" : "s"}` : loading ? "…" : "No ratings yet"}
      />
      <Tile
        label={s?.forYou?.yours ? "You" : "For you"}
        score={s?.forYou?.score}
        sub={s?.forYou ? s.forYou.basis : loading ? "…" : "Rate a few sets to unlock"}
        highlight
        predicted={Boolean(s?.forYou && !s.forYou.yours)}
      />
      <Tile
        label="Friends"
        score={s?.friends?.score}
        sub={s?.friends ? (s.friends.count === 1 ? `@${s.friends.names[0]}` : `${s.friends.count} friends`) : loading ? "…" : "No friends' ratings"}
      />
    </div>
  );
}

function Tile({
  label,
  score,
  sub,
  highlight = false,
  predicted = false,
}: {
  label: string;
  score?: number;
  sub: string;
  highlight?: boolean;
  predicted?: boolean;
}) {
  const bucket = score === undefined ? null : bucketForScore(score);
  return (
    <div className={`trio-tile${highlight ? " highlight" : ""}${bucket ? ` ${bucket}` : ""}`}>
      <span className="trio-label">{label}</span>
      <b className="trio-score">
        {score === undefined ? "—" : score.toFixed(1)}
        {predicted && <i aria-label="predicted">✦</i>}
      </b>
      <span className="trio-sub">{sub}</span>
    </div>
  );
}
