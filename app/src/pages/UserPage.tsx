import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useEncoreStore } from "../lib/store";
import { fetchUserRankings, SocialSetupError } from "../lib/social";
import { venueRatedLogs } from "../lib/ranking";
import type { SetLog } from "../lib/types";
import { Loader } from "../components/Vinyl";
import { UserAvatar } from "../components/UserAvatar";
import { AvatarThumb } from "../components/AvatarThumb";
import { RankingsList } from "../components/RankingsList";

type State = { status: "loading" } | { status: "missing" | "error" | "setup" } | { status: "ok"; name: string; logs: SetLog[] };

export function UserPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const me = useEncoreStore((s) => s.session?.user.id);
  const myLogs = useEncoreStore((s) => s.logs);
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let stale = false;
    setState({ status: "loading" });
    fetchUserRankings(id)
      .then((r) => {
        if (!stale) setState(r ? { status: "ok", ...r } : { status: "missing" });
      })
      .catch((e) => {
        if (!stale) setState({ status: e instanceof SocialSetupError ? "setup" : "error" });
      });
    return () => {
      stale = true;
    };
  }, [id]);

  const logs = state.status === "ok" ? state.logs : null;
  const match = useMemo(() => (logs ? tasteMatch(myLogs, logs) : null), [myLogs, logs]);
  const top = useMemo(() => (logs ? [...logs].sort((a, b) => b.score - a.score).slice(0, 3) : []), [logs]);

  if (id === me) return <Navigate to="/" replace />;
  if (state.status === "loading") return <Loader label="Loading their rankings" />;
  if (state.status !== "ok") {
    return (
      <div className="empty-state">
        <p>
          {state.status === "missing"
            ? "That person isn't on Encore."
            : state.status === "setup"
              ? "Re-run supabase/schema.sql in Supabase to turn on profiles."
              : "Couldn't load their rankings — check your connection."}
        </p>
        <button className="ghost-btn" onClick={() => navigate("/people")}>
          Back to People
        </button>
      </div>
    );
  }

  const { name } = state;
  const count = state.logs.length;
  const venues = new Set(venueRatedLogs(state.logs).map((l) => l.event.trim().toLowerCase())).size;
  const avg = count ? state.logs.reduce((s, l) => s + l.score, 0) / count : null;
  const firstName = name.split(/\s+/)[0];

  return (
    <div>
      <button className="artist-back" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="profile-hero">
        <UserAvatar id={id} name={name} size={88} />
        <h1 className="display artist-name">{name}</h1>
        {match && (
          <p className="taste-match">
            <b>{match.percent}% taste match</b> · {match.shared} artist{match.shared === 1 ? "" : "s"} you've both seen
          </p>
        )}
      </div>

      <div className="artist-stats">
        <div className="stat">
          <b>{count}</b>
          <span>Set{count === 1 ? "" : "s"}</span>
        </div>
        <div className="stat">
          <b>{venues}</b>
          <span>Venue{venues === 1 ? "" : "s"}</span>
        </div>
        <div className="stat">
          <b>{avg === null ? "—" : avg.toFixed(1)}</b>
          <span>Avg score</span>
        </div>
      </div>

      {count === 0 ? (
        <p style={{ textAlign: "center", color: "var(--smoke)" }}>{firstName} hasn't logged any sets yet.</p>
      ) : (
        <>
          {top.length >= 3 && (
            <>
              <div className="section-label">{firstName}'s top 3</div>
              <div className="podium">
                {top.map((log, i) => (
                  <Link key={log.id} to={`/set/${log.id}`} className={`podium-card place-${i + 1}`}>
                    <span className="podium-place">{i + 1}</span>
                    <AvatarThumb name={log.artist} />
                    <span className="podium-name">{log.artist}</span>
                    <span className="podium-score">{log.score.toFixed(1)}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
          <div className="section-label" style={{ marginTop: "1.6rem", marginBottom: "-0.8rem" }}>
            {firstName}'s rankings
          </div>
          <RankingsList logs={state.logs} />
        </>
      )}
    </div>
  );
}

// How closely two people rate the artists they've both seen: 100% means
// identical average scores for every shared artist, dropping 10 points per
// point of average disagreement.
function tasteMatch(mine: SetLog[], theirs: SetLog[]): { percent: number; shared: number } | null {
  const avgBy = (logs: SetLog[]) => {
    const m = new Map<string, number[]>();
    for (const l of logs) {
      const k = l.artist.trim().toLowerCase();
      m.set(k, [...(m.get(k) ?? []), l.score]);
    }
    return new Map([...m].map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]));
  };
  const a = avgBy(mine);
  const b = avgBy(theirs);
  const diffs = [...a].filter(([k]) => b.has(k)).map(([k, v]) => Math.abs(v - b.get(k)!));
  if (diffs.length === 0) return null;
  const meanDiff = diffs.reduce((x, y) => x + y, 0) / diffs.length;
  return { percent: Math.max(0, Math.round(100 - meanDiff * 10)), shared: diffs.length };
}
