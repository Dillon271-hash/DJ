import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ScoreRing } from "./ScoreRing";
import { BucketFilter, ViewToggle, type BucketFilterValue } from "./BucketFilter";
import { AvatarThumb } from "./AvatarThumb";
import { RowMenu } from "./RowMenu";
import { bucketForScore, sortLogs, venueRatedLogs } from "../lib/ranking";
import { BUCKET_LABEL, type Bucket, type SetLog } from "../lib/types";
import { formatShortDate } from "../lib/dates";

type Filter = BucketFilterValue;
type View = "sets" | "venues";


interface VenueSummary {
  name: string;
  count: number;
  avg: number;
  bucket: Bucket;
}

// The Sets / Venues toggle, bucket filters and ranked rows — shared by
// your own Rankings page (with delete menus) and other people's profiles
// (read-only).
export function RankingsList({ logs, onDelete }: { logs: SetLog[]; onDelete?: (id: string) => void }) {
  const [view, setView] = useState<View>("sets");
  const [filter, setFilter] = useState<Filter>("all");

  const visibleSets = useMemo(() => {
    const sorted = sortLogs(logs);
    return filter === "all" ? sorted : sorted.filter((l) => l.bucket === filter);
  }, [logs, filter]);

  const allVenues = useMemo<VenueSummary[]>(() => {
    const byVenue = new Map<string, { name: string; scores: number[] }>();
    for (const log of venueRatedLogs(logs)) {
      const key = log.event.trim().toLowerCase();
      const existing = byVenue.get(key);
      if (existing) existing.scores.push(log.venueScore);
      else byVenue.set(key, { name: log.event, scores: [log.venueScore] });
    }
    const summaries = [...byVenue.values()].map((v) => {
      const avg = v.scores.reduce((a, b) => a + b, 0) / v.scores.length;
      return { name: v.name, count: v.scores.length, avg, bucket: bucketForScore(avg) };
    });
    summaries.sort((a, b) => b.avg - a.avg);
    return summaries;
  }, [logs]);

  const venueSummaries = useMemo(
    () => (filter === "all" ? allVenues : allVenues.filter((v) => v.bucket === filter)),
    [allVenues, filter],
  );
  const venueTotal = allVenues.length;

  // How many are in each bucket, for whichever view is showing.
  const counts = useMemo(() => {
    const items: Bucket[] = view === "sets" ? logs.map((l) => l.bucket) : allVenues.map((v) => v.bucket);
    return {
      all: items.length,
      loved: items.filter((b) => b === "loved").length,
      good: items.filter((b) => b === "good").length,
      not: items.filter((b) => b === "not").length,
    };
  }, [view, logs, allVenues]);

  return (
    <>
      <ViewToggle
        value={view}
        onChange={setView}
        options={[
          { key: "sets", label: "Sets", count: logs.length },
          { key: "venues", label: "Venues", count: venueTotal },
        ]}
      />

      <BucketFilter value={filter} onChange={setFilter} counts={counts} />

      {view === "sets" ? (
        visibleSets.length === 0 ? (
          <p style={{ color: "var(--smoke)" }}>No sets in this bucket yet.</p>
        ) : (
          <div>
            {visibleSets.map((log, i) => (
              <div key={log.id} className="rank-row-wrap">
                <Link to={`/set/${log.id}`} className={`rank-row${onDelete ? "" : " no-menu"}`}>
                  <AvatarThumb name={log.artist} />
                  <div className="info">
                    <div className="title-line">
                      <span className="num">{i + 1}.</span>
                      <span className="who">{log.artist}</span>
                    </div>
                    <div className="meta">
                      {log.event} · {formatShortDate(log.date)}
                    </div>
                  </div>
                  <ScoreRing score={log.score} bucket={log.bucket} />
                </Link>
                {onDelete && <RowMenu onDelete={() => onDelete(log.id)} />}
              </div>
            ))}
          </div>
        )
      ) : venueSummaries.length === 0 ? (
        <p style={{ color: "var(--smoke)" }}>No rated venues in this bucket yet.</p>
      ) : (
        <div>
          {venueSummaries.map((v, i) => (
            <Link key={v.name} to={`/venue/${encodeURIComponent(v.name)}`} className="rank-row rank-row-standalone">
              <div className="info">
                <div className="title-line">
                  <span className="num">{i + 1}.</span>
                  <span className="who">{v.name}</span>
                </div>
                <div className="meta">
                  {v.count} visit{v.count === 1 ? "" : "s"} rated
                </div>
              </div>
              <ScoreRing score={v.avg} bucket={v.bucket} />
            </Link>
          ))}
        </div>
      )}

      <p style={{ fontSize: "0.78rem", color: "var(--smoke)", marginTop: "1.6rem" }}>
        {view === "sets"
          ? `Ranked within ${filter === "all" ? "each bucket" : `"${BUCKET_LABEL[filter]}"`} by score, highest first.`
          : `Venues ranked by average score${filter === "all" ? "" : ` within "${BUCKET_LABEL[filter]}"`}, highest first.`}
      </p>
    </>
  );
}
