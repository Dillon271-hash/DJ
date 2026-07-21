import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEncoreStore } from "../lib/store";
import { venueRatedLogs } from "../lib/ranking";
import { ScorePill } from "../components/ScorePill";
import { BUCKET_LABEL } from "../lib/types";

export function VenuePage() {
  const { name } = useParams();
  const venue = decodeURIComponent(name ?? "").trim();
  const navigate = useNavigate();

  const logs = useEncoreStore((s) => s.logs);
  const visits = useMemo(
    () =>
      venueRatedLogs(logs)
        .filter((l) => l.event.trim().toLowerCase() === venue.toLowerCase())
        .sort((a, b) => b.venueScore - a.venueScore),
    [logs, venue],
  );

  const count = visits.length;
  const avg = count ? visits.reduce((sum, l) => sum + l.venueScore, 0) / count : null;
  const best = count ? visits[0].venueScore : null;

  return (
    <div>
      <button className="artist-back" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="artist-hero">
        <div className="artist-avatar">
          <span className="initials">{initials(venue)}</span>
        </div>
        <h1 className="display artist-name">{venue}</h1>
      </div>

      {count > 0 ? (
        <div className="artist-stats">
          <div className="stat">
            <b>{count}</b>
            <span>Visit{count === 1 ? "" : "s"} rated</span>
          </div>
          <div className="stat">
            <b>{avg!.toFixed(1)}</b>
            <span>Avg score</span>
          </div>
          <div className="stat">
            <b>{best!.toFixed(1)}</b>
            <span>Best</span>
          </div>
        </div>
      ) : (
        <p style={{ textAlign: "center", color: "var(--smoke)" }}>
          No rated visits to {venue} yet.
        </p>
      )}

      {count > 0 && (
        <>
          <hr className="perf" style={{ margin: "1.8rem 0 0.6rem" }} />
          <div className="eyebrow" style={{ margin: "0 0 0.4rem" }}>
            Sets logged here
          </div>
          <div>
            {visits.map((log) => (
              <Link key={log.id} to={`/set/${log.id}`} className="rank-row">
                <div className="info">
                  <div className="who">{log.artist}</div>
                  <div className="meta">
                    {formatDate(log.date)} · {BUCKET_LABEL[log.venueBucket]}
                  </div>
                </div>
                <ScorePill score={log.venueScore} bucket={log.venueBucket} />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
