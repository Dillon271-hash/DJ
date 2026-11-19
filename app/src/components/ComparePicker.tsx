import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchArtistImage } from "../lib/artistImage";
import { fetchVenueImage } from "../lib/venueImage";
import { finalizeScore, maxComparisons, narrowRange, pickComparisonTarget, tooCloseScore } from "../lib/ranking";

export interface CompareItem {
  id: string;
  score: number;
  title: string;
  subtitle?: string;
}

type Kind = "artist" | "venue";

interface Snapshot {
  lo: number;
  hi: number;
  exclude: string[];
  targetId: string;
  count: number;
}

// How long the "you picked this one" animation plays before moving on.
const PICK_MS = 420;

/** The "which was better?" step. Runs the same binary-search narrowing as
 * before (see ranking.ts), but one question at a time as two tappable
 * photo cards — the thing being rated stays on the left, and each new
 * opponent deals in on the right. Calls onDone once with the final score. */
export function ComparePicker({
  kind,
  subject,
  candidates,
  range,
  onDone,
}: {
  kind: Kind;
  subject: { title: string; subtitle?: string };
  candidates: CompareItem[];
  range: [number, number];
  onDone: (score: number) => void;
}) {
  const scores = useMemo(() => candidates.map((c) => c.score), [candidates]);
  const max = maxComparisons(candidates.length);

  const [lo, setLo] = useState(range[0]);
  const [hi, setHi] = useState(range[1]);
  const [exclude, setExclude] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState<CompareItem | null>(() =>
    pickComparisonTarget(candidates, range[0], range[1], new Set()),
  );
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [picked, setPicked] = useState<"subject" | "target" | null>(null);
  const finished = useRef(false);
  const pickTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(pickTimer.current), []);

  const finish = useCallback(
    (score: number) => {
      if (finished.current) return;
      finished.current = true;
      onDone(score);
    },
    [onDone],
  );

  // Nothing in range to compare against (the caller normally skips this
  // step in that case, but cover it anyway).
  useEffect(() => {
    if (!target) finish(finalizeScore(lo, hi, scores));
  }, [target, lo, hi, scores, finish]);

  const choose = useCallback(
    (subjectWasBetter: boolean) => {
      if (!target || picked) return;
      setPicked(subjectWasBetter ? "subject" : "target");
      pickTimer.current = window.setTimeout(() => {
        const [nlo, nhi] = narrowRange(lo, hi, target, subjectWasBetter);
        const nextExclude = [...exclude, target.id];
        const nextCount = count + 1;
        const next = nextCount >= max ? null : pickComparisonTarget(candidates, nlo, nhi, new Set(nextExclude));
        if (!next) {
          finish(finalizeScore(nlo, nhi, scores));
          return;
        }
        setHistory((h) => [...h, { lo, hi, exclude, targetId: target.id, count }]);
        setLo(nlo);
        setHi(nhi);
        setExclude(nextExclude);
        setCount(nextCount);
        setTarget(next);
        setPicked(null);
      }, PICK_MS);
    },
    [target, picked, lo, hi, exclude, count, max, candidates, scores, finish],
  );

  function undo() {
    const last = history[history.length - 1];
    if (!last || picked) return;
    setHistory((h) => h.slice(0, -1));
    setLo(last.lo);
    setHi(last.hi);
    setExclude(last.exclude);
    setCount(last.count);
    setTarget(candidates.find((c) => c.id === last.targetId) ?? null);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") choose(true);
      if (e.key === "ArrowRight") choose(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose]);

  if (!target) return null;

  return (
    <div className="compare">
      <div className="compare-progress" aria-label={`Question ${count + 1} of up to ${max}`}>
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={i < count ? "done" : i === count ? "current" : ""} />
        ))}
      </div>

      <div className="compare-stage">
        <CompareCard
          kind={kind}
          side="left"
          title={subject.title}
          subtitle={subject.subtitle}
          badge="New"
          state={picked === "subject" ? "won" : picked === "target" ? "lost" : "idle"}
          onClick={() => choose(true)}
        />
        <span className="compare-vs" aria-hidden="true">
          VS
        </span>
        <CompareCard
          key={target.id}
          kind={kind}
          side="right"
          title={target.title}
          subtitle={target.subtitle}
          state={picked === "target" ? "won" : picked === "subject" ? "lost" : "idle"}
          onClick={() => choose(false)}
        />
      </div>

      <div className="compare-actions">
        <button type="button" className="ghost-btn" disabled={!!picked} onClick={() => finish(tooCloseScore(lo, hi, target, scores))}>
          Too close to call
        </button>
        <div className="compare-secondary">
          <button type="button" className="text-btn" disabled={history.length === 0 || !!picked} onClick={undo}>
            Undo
          </button>
          <button type="button" className="text-btn" disabled={!!picked} onClick={() => finish(finalizeScore(lo, hi, scores))}>
            Skip the rest
          </button>
        </div>
      </div>
    </div>
  );
}

function CompareCard({
  kind,
  side,
  title,
  subtitle,
  badge,
  state,
  onClick,
}: {
  kind: Kind;
  side: "left" | "right";
  title: string;
  subtitle?: string;
  badge?: string;
  state: "idle" | "won" | "lost";
  onClick: () => void;
}) {
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    let stale = false;
    setImage(null);
    (kind === "artist" ? fetchArtistImage(title) : fetchVenueImage(title)).then((url) => {
      if (!stale) setImage(url);
    });
    return () => {
      stale = true;
    };
  }, [kind, title]);

  return (
    <button
      type="button"
      className={`compare-card ${side} ${state}`}
      onClick={onClick}
      aria-label={`${title}${subtitle ? `, ${subtitle}` : ""}`}
    >
      <span className="compare-art">
        {image ? (
          <img src={image} alt="" referrerPolicy="no-referrer" decoding="async" onError={() => setImage(null)} />
        ) : (
          <span className={`compare-fallback ${kind}`}>
            <span>{initials(title)}</span>
          </span>
        )}
      </span>
      {badge && <span className="compare-badge">{badge}</span>}
      <span className="compare-check" aria-hidden="true">
        ✓
      </span>
      <span className="compare-caption">
        <span className="compare-title">{title}</span>
        {subtitle && <span className="compare-subtitle">{subtitle}</span>}
      </span>
    </button>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
