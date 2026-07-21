import { Link, useNavigate, useParams } from "react-router-dom";
import { useEncoreStore } from "../lib/store";
import { overallRank, rankInBucket } from "../lib/ranking";
import { BUCKET_LABEL } from "../lib/types";

export function SetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const logs = useEncoreStore((s) => s.logs);

  const log = logs.find((l) => l.id === id);

  if (!log) {
    return (
      <div className="empty-state">
        <p>That set isn't in your log.</p>
        <button className="ghost-btn" onClick={() => navigate("/")}>
          Back to rankings
        </button>
      </div>
    );
  }

  const inBucketRank = rankInBucket(logs, log.bucket, log.id);
  const bucketCount = logs.filter((l) => l.bucket === log.bucket).length;
  const overall = overallRank(logs, log.id);

  return (
    <div>
      <div className="eyebrow">{BUCKET_LABEL[log.bucket]}</div>
      <Link
        to={`/artist/${encodeURIComponent(log.artist)}`}
        style={{ textDecoration: "none" }}
      >
        <h1 className="display" style={{ fontSize: "2rem", margin: "0.3rem 0 0.1rem" }}>
          {log.artist}
        </h1>
      </Link>
      <p style={{ color: "var(--bone-dim)", margin: 0 }}>
        {log.event} — {formatDate(log.date)}
      </p>

      <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", margin: "1.2rem 0" }}>
        <span
          className="display"
          style={{
            fontSize: "2.6rem",
            background: "linear-gradient(135deg, var(--glow-core), var(--glow-edge))",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {log.score.toFixed(1)}
        </span>
        <span className="mono" style={{ fontSize: "0.75rem", color: "var(--smoke)" }}>
          #{inBucketRank} of {bucketCount} you {BUCKET_LABEL[log.bucket].toLowerCase()}
        </span>
      </div>

      {log.withWho && (
        <p style={{ color: "var(--smoke)", fontSize: "0.85rem", margin: "0 0 0.8rem" }}>
          With {log.withWho}
        </p>
      )}

      {log.labels && log.labels.length > 0 && (
        <div className="chip-row" style={{ marginBottom: "0.4rem" }}>
          {log.labels.map((l) => (
            <span className="chip" key={l}>
              {l}
            </span>
          ))}
        </div>
      )}

      {log.note && (
        <>
          <hr className="perf" />
          <p style={{ color: "var(--bone-dim)" }}>{log.note}</p>
        </>
      )}

      <hr className="perf" />
      <div className="stat-grid">
        <div className="stat">
          <b>#{overall}</b>
          <span>All-time rank</span>
        </div>
        <div className="stat">
          <b>#{inBucketRank}</b>
          <span>{BUCKET_LABEL[log.bucket]}</span>
        </div>
        <div className="stat">
          <b>{logs.length}</b>
          <span>Total logs</span>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}
