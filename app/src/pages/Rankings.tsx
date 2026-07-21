import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ScoreRing } from "../components/ScoreRing";
import { AvatarThumb } from "../components/AvatarThumb";
import { RowMenu } from "../components/RowMenu";
import { useEncoreStore } from "../lib/store";
import { bucketForScore, sortLogs, venueRatedLogs } from "../lib/ranking";
import { BUCKET_LABEL, type Bucket } from "../lib/types";

type Filter = "all" | Bucket;
type View = "sets" | "venues";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "loved", label: "Loved it" },
  { key: "good", label: "It was good" },
  { key: "not", label: "Not for me" },
];

interface VenueSummary {
  name: string;
  count: number;
  avg: number;
  bucket: Bucket;
}

export function Rankings() {
  const logs = useEncoreStore((s) => s.logs);
  const removeLog = useEncoreStore((s) => s.removeLog);
  const [view, setView] = useState<View>("sets");
  const [filter, setFilter] = useState<Filter>("all");

  const visibleSets = useMemo(() => {
    const sorted = sortLogs(logs);
    return filter === "all" ? sorted : sorted.filter((l) => l.bucket === filter);
  }, [logs, filter]);

  const venueSummaries = useMemo<VenueSummary[]>(() => {
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
    return filter === "all" ? summaries : summaries.filter((v) => v.bucket === filter);
  }, [logs, filter]);

  if (logs.length === 0) return <EmptyState />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
        <div>
          <div className="eyebrow">Your rankings</div>
          <h1 className="display" style={{ fontSize: "1.9rem", margin: "0.3rem 0 0" }}>
            {logs.length} set{logs.length === 1 ? "" : "s"} logged
          </h1>
        </div>
        <Link to="/log" className="sticker-btn">
          + Log
        </Link>
      </div>

      <div className="chip-row" style={{ marginTop: "1.6rem", marginBottom: "0.6rem" }}>
        <button className={`chip ${view === "sets" ? "active" : ""}`} onClick={() => setView("sets")}>
          Sets
        </button>
        <button className={`chip ${view === "venues" ? "active" : ""}`} onClick={() => setView("venues")}>
          Venues
        </button>
      </div>

      <div className="chip-row">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`chip ${filter === f.key ? "active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {view === "sets" ? (
        visibleSets.length === 0 ? (
          <p style={{ color: "var(--smoke)" }}>No sets in this bucket yet.</p>
        ) : (
          <div>
            {visibleSets.map((log, i) => (
              <div key={log.id} className="rank-row-wrap">
                <Link to={`/set/${log.id}`} className="rank-row">
                  <AvatarThumb name={log.artist} />
                  <div className="info">
                    <div className="title-line">
                      <span className="num">{i + 1}.</span>
                      <span className="who">{log.artist}</span>
                    </div>
                    <div className="meta">
                      {log.event} · {formatDate(log.date)}
                    </div>
                  </div>
                  <ScoreRing score={log.score} bucket={log.bucket} />
                </Link>
                <RowMenu onDelete={() => removeLog(log.id)} />
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
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
