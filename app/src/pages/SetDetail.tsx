import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useEncoreStore } from "../lib/store";
import { overallRank, rankInBucket } from "../lib/ranking";
import { isVideoPath, mediaUrl } from "../lib/media";
import { formatLongDate } from "../lib/dates";
import { BUCKET_LABEL, type SetLog } from "../lib/types";
import { Loader } from "../components/Vinyl";
import { UserAvatar } from "../components/UserAvatar";
import { PostActions } from "../components/PostActions";
import { Comments } from "../components/Comments";

type Shared =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ok"; log: SetLog; owner: { id: string; name: string }; ownerLogs: SetLog[] };

export function SetDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const logs = useEncoreStore((s) => s.logs);
  const logsLoading = useEncoreStore((s) => s.logsLoading);
  const me = useEncoreStore((s) => s.session?.user.id ?? "");
  // Opened from a feed card's comment button → jump to the thread.
  const wantsComments = useLocation().hash === "#comments";

  const mine = logs.find((l) => l.id === id);
  // Not one of mine (once mine have loaded) → it's someone else's set,
  // opened from People or their profile.
  const lookElsewhere = !mine && !logsLoading;
  const [shared, setShared] = useState<Shared>({ status: "loading" });

  useEffect(() => {
    if (!lookElsewhere) return;
    let stale = false;
    setShared({ status: "loading" });
    import("../lib/social")
      .then((m) => m.fetchSharedSet(id))
      .then((r) => !stale && setShared(r ? { status: "ok", ...r } : { status: "missing" }))
      .catch(() => !stale && setShared({ status: "missing" }));
    return () => {
      stale = true;
    };
  }, [id, lookElsewhere]);

  if (!mine && (logsLoading || shared.status === "loading")) return <Loader label="Loading set" />;

  if (!mine && shared.status !== "ok") {
    return (
      <div className="empty-state">
        <p>That set doesn't exist anymore.</p>
        <button className="ghost-btn" onClick={() => navigate("/rankings")}>
          Back to rankings
        </button>
      </div>
    );
  }

  const log = mine ?? (shared as Extract<Shared, { status: "ok" }>).log;
  const owner = mine ? null : (shared as Extract<Shared, { status: "ok" }>).owner;
  const pool = mine ? logs : (shared as Extract<Shared, { status: "ok" }>).ownerLogs;
  const firstName = owner?.name.split(/\s+/)[0];

  const inBucketRank = rankInBucket(pool, log.bucket, log.id);
  const bucketCount = pool.filter((l) => l.bucket === log.bucket).length;
  const overall = overallRank(pool, log.id);

  return (
    <div>
      {owner && (
        <Link to={`/u/${owner.id}`} className="set-owner">
          <UserAvatar id={owner.id} name={owner.name} size={30} />
          <span>
            <b>{owner.name}</b>'s set
          </span>
        </Link>
      )}
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
        {log.event} — {formatLongDate(log.date)}
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
          #{inBucketRank} of {bucketCount} {owner ? `${firstName}` : "you"} {BUCKET_LABEL[log.bucket].toLowerCase()}
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

      {log.mediaPaths && log.mediaPaths.length > 0 && (
        <>
          <hr className="perf" />
          <div className="set-media-gallery">
            {log.mediaPaths.map((path) =>
              isVideoPath(path) ? (
                <video key={path} src={mediaUrl(path)} controls playsInline preload="metadata" />
              ) : (
                <img key={path} src={mediaUrl(path)} alt="" loading="lazy" decoding="async" />
              ),
            )}
          </div>
        </>
      )}

      <PostActions
        log={log}
        ownerName={owner?.name}
        onComment={() => document.getElementById("comments")?.querySelector("textarea")?.focus()}
      />

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
          <b>{pool.length}</b>
          <span>Total logs</span>
        </div>
      </div>

      <Comments logId={log.id} ownerId={owner?.id ?? me} autoFocus={wantsComments} />
    </div>
  );
}
