import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchCrewBoard, fetchSoloBoard, SocialSetupError, useSocial, type BoardRow } from "../lib/social";
import { useEncoreStore } from "../lib/store";
import { SPINS, tierFor } from "../lib/spins";
import { Loader } from "../components/Vinyl";
import { UserAvatar } from "../components/UserAvatar";
import { CrewBadge } from "../components/CrewBadge";
import { SpinsCard } from "../components/SpinsCard";

type Board = "solo" | "crews";

export function Charts() {
  const [params, setParams] = useSearchParams();
  const board: Board = params.get("board") === "crews" ? "crews" : "solo";
  const me = useEncoreStore((s) => s.session?.user.id ?? "");
  const myLogs = useEncoreStore((s) => s.logs);
  const myCrewIds = useSocial((s) => s.crews?.mine.map((c) => c.id).join(",") ?? "");
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [error, setError] = useState<"setup" | "other" | null>(null);
  const [showHow, setShowHow] = useState(false);

  useEffect(() => {
    let stale = false;
    setRows(null);
    setError(null);
    (board === "solo" ? fetchSoloBoard() : fetchCrewBoard())
      .then((r) => !stale && setRows(r))
      .catch((e) => {
        if (stale) return;
        console.error("[charts] load failed:", e);
        setError(e instanceof SocialSetupError ? "setup" : "other");
      });
    return () => {
      stale = true;
    };
  }, [board]);

  const mine = new Set(board === "solo" ? [me] : myCrewIds.split(",").filter(Boolean));
  const myIndex = rows?.findIndex((r) => mine.has(r.id)) ?? -1;

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">Disko</div>
          <h1 className="display page-title">The Charts</h1>
        </div>
      </div>

      <div className="seg seg-wide" style={{ marginTop: "1.2rem" }}>
        <button type="button" className={board === "solo" ? "on" : ""} onClick={() => setParams({}, { replace: true })}>
          Solo
        </button>
        <button
          type="button"
          className={board === "crews" ? "on" : ""}
          onClick={() => setParams({ board: "crews" }, { replace: true })}
        >
          Crews
        </button>
      </div>

      {board === "solo" && (
        <div style={{ marginTop: "1.2rem" }}>
          <SpinsCard logs={myLogs} link={false} />
        </div>
      )}

      {error ? (
        <p className="hint" style={{ marginTop: "1.4rem" }}>
          {error === "setup"
            ? "Re-run supabase/schema.sql in your Supabase SQL Editor to turn on the Charts."
            : "Couldn't load the Charts — check your connection."}
        </p>
      ) : rows === null ? (
        <Loader label="Loading the Charts" size={52} />
      ) : rows.length === 0 ? (
        <div className="people-empty">
          <p>{board === "solo" ? "No one's on the board yet — log a set to take #1." : "No crews yet. Start one and claim the top spot."}</p>
          <Link to={board === "solo" ? "/log" : "/crews"} className="sticker-btn">
            {board === "solo" ? "Log a set" : "Start a crew"}
          </Link>
        </div>
      ) : (
        <>
          {myIndex >= 0 && (
            <p className="your-rank">
              {board === "solo" ? "You're" : "Your crew is"} <b>#{myIndex + 1}</b> of {rows.length}
            </p>
          )}
          <Podium rows={rows.slice(0, 3)} board={board} mine={mine} />
          <ol className="chart-list" start={4}>
            {rows.slice(3).map((r, i) => (
              <li key={r.id}>
                <ChartRow row={r} pos={i + 4} board={board} me={me} highlight={mine.has(r.id)} />
              </li>
            ))}
          </ol>
        </>
      )}

      <button type="button" className="link-btn" onClick={() => setShowHow((v) => !v)} style={{ marginTop: "1.4rem" }}>
        {showHow ? "Hide" : "How spins work"}
      </button>
      {showHow && (
        <div className="how-spins">
          <p>Every set you log earns spins:</p>
          <ul>
            <li>
              <b>+{SPINS.perSet}</b> for each set
            </li>
            <li>
              <b>+{SPINS.note}</b> when you write notes
            </li>
            <li>
              <b>+{SPINS.media}</b> when you add photos or videos
            </li>
            <li>
              <b>+{SPINS.newArtist}</b> for every new artist you log
            </li>
          </ul>
          <p>A crew's spins are everyone in it added together. Climb from Opener to Warm-up, Peak Time, Headliner and Legend.</p>
        </div>
      )}
    </div>
  );
}

function Podium({ rows, board, mine }: { rows: BoardRow[]; board: Board; mine: Set<string> }) {
  // 2nd · 1st · 3rd, like a real podium.
  const order = [rows[1], rows[0], rows[2]];
  const places = [2, 1, 3];
  return (
    <div className="chart-podium">
      {order.map((r, i) =>
        r ? (
          <Link
            key={r.id}
            to={board === "solo" ? (mine.has(r.id) ? "/" : `/u/${r.id}`) : `/crews/${r.id}`}
            className={`chart-step place-${places[i]}${mine.has(r.id) ? " mine" : ""}`}
          >
            <span className="chart-medal">{places[i]}</span>
            {board === "solo" ? (
              <UserAvatar id={r.id} name={r.name} size={places[i] === 1 ? 72 : 56} />
            ) : (
              <CrewBadge name={r.name} color={r.color ?? 0} size={places[i] === 1 ? 76 : 58} />
            )}
            <span className="chart-step-name">{r.name}</span>
            <span className="chart-step-spins">{r.spins.toLocaleString()}</span>
            <span className="chart-step-base" />
          </Link>
        ) : (
          <span key={`empty-${i}`} />
        ),
      )}
    </div>
  );
}

function ChartRow({ row, pos, board, me, highlight }: { row: BoardRow; pos: number; board: Board; me: string; highlight: boolean }) {
  const to = board === "solo" ? (row.id === me ? "/" : `/u/${row.id}`) : `/crews/${row.id}`;
  return (
    <Link to={to} className={`chart-row${highlight ? " mine" : ""}`}>
      <span className="chart-pos">{pos}</span>
      {board === "solo" ? (
        <UserAvatar id={row.id} name={row.name} size={38} />
      ) : (
        <CrewBadge name={row.name} color={row.color ?? 0} size={40} />
      )}
      <span className="chart-name">
        {row.name}
        {highlight && board === "solo" && <small> (you)</small>}
        <small className="chart-sub">
          {board === "solo"
            ? `${tierFor(row.spins).tier.name} · ${row.setCount} set${row.setCount === 1 ? "" : "s"}`
            : `${row.memberCount} member${row.memberCount === 1 ? "" : "s"}`}
        </small>
      </span>
      <span className="chart-spins">{row.spins.toLocaleString()}</span>
    </Link>
  );
}
