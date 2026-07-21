import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ScorePill } from "../components/ScorePill";
import { AvatarThumb } from "../components/AvatarThumb";
import { RowMenu } from "../components/RowMenu";
import { useEncoreStore } from "../lib/store";
import { sortLogs } from "../lib/ranking";
import { BUCKET_LABEL, type Bucket } from "../lib/types";

type Filter = "all" | Bucket;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "loved", label: "Loved it" },
  { key: "good", label: "It was good" },
  { key: "not", label: "Not for me" },
];

export function Rankings() {
  const logs = useEncoreStore((s) => s.logs);
  const removeLog = useEncoreStore((s) => s.removeLog);
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(() => {
    const sorted = sortLogs(logs);
    return filter === "all" ? sorted : sorted.filter((l) => l.bucket === filter);
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

      <div className="chip-row" style={{ marginTop: "1.6rem" }}>
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

      {visible.length === 0 ? (
        <p style={{ color: "var(--smoke)" }}>No sets in this bucket yet.</p>
      ) : (
        <div>
          {visible.map((log, i) => (
            <div key={log.id} className="rank-row-wrap">
              <Link to={`/set/${log.id}`} className="rank-row">
                <span className="num">{i + 1}</span>
                <AvatarThumb name={log.artist} />
                <div className="info">
                  <div className="who">{log.artist}</div>
                  <div className="meta">
                    {log.event} · {formatDate(log.date)}
                  </div>
                </div>
                <ScorePill score={log.score} bucket={log.bucket} />
              </Link>
              <RowMenu onDelete={() => removeLog(log.id)} />
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: "0.78rem", color: "var(--smoke)", marginTop: "1.6rem" }}>
        Ranked within {filter === "all" ? "each bucket" : `"${BUCKET_LABEL[filter]}"`} by score, highest first.
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
