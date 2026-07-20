import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useEncoreStore } from "../lib/store";
import {
  MAX_COMPARISONS,
  bucketRange,
  finalizeScore,
  narrowRange,
  pickComparisonTarget,
} from "../lib/ranking";
import { BUCKET_LABEL, type Bucket, type DraftLog, type SetLog } from "../lib/types";

type Step = "details" | "bucket" | "compare" | "done";

const EMPTY_DRAFT: DraftLog = { artist: "", event: "", date: "", genre: "", note: "" };

export function LogAndRate() {
  const logs = useEncoreStore((s) => s.logs);
  const addLog = useEncoreStore((s) => s.addLog);
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("details");
  const [draft, setDraft] = useState<DraftLog>(EMPTY_DRAFT);

  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [range, setRange] = useState<[number, number]>([0, 10]);
  const [excludeIds, setExcludeIds] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<SetLog | null>(null);
  const [comparisons, setComparisons] = useState(0);
  const [savedLog, setSavedLog] = useState<SetLog | null>(null);

  function handleDetailsSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft.artist.trim() || !draft.event.trim() || !draft.date) return;
    setStep("bucket");
  }

  function chooseBucket(chosen: Bucket) {
    setBucket(chosen);
    const [lo, hi] = bucketRange(chosen);
    const candidates = logs.filter((l) => l.bucket === chosen);

    if (candidates.length === 0) {
      finish(chosen, finalizeScore(lo, hi, []));
      return;
    }

    const first = pickComparisonTarget(candidates, lo, hi, new Set());
    if (!first) {
      finish(chosen, finalizeScore(lo, hi, candidates.map((c) => c.score)));
      return;
    }

    setRange([lo, hi]);
    setTarget(first);
    setExcludeIds(new Set());
    setComparisons(0);
    setStep("compare");
  }

  function answerCompare(newSetWasBetter: boolean) {
    if (!bucket || !target) return;
    const [lo, hi] = narrowRange(range[0], range[1], target, newSetWasBetter);
    const nextExclude = new Set(excludeIds).add(target.id);
    const nextComparisons = comparisons + 1;
    const candidates = logs.filter((l) => l.bucket === bucket);

    if (nextComparisons >= MAX_COMPARISONS) {
      finish(bucket, finalizeScore(lo, hi, candidates.map((c) => c.score)));
      return;
    }

    const next = pickComparisonTarget(candidates, lo, hi, nextExclude);
    if (!next) {
      finish(bucket, finalizeScore(lo, hi, candidates.map((c) => c.score)));
      return;
    }

    setRange([lo, hi]);
    setTarget(next);
    setExcludeIds(nextExclude);
    setComparisons(nextComparisons);
  }

  function finish(finalBucket: Bucket, score: number) {
    const entry = addLog(draft, finalBucket, score);
    setSavedLog(entry);
    setStep("done");
  }

  return (
    <div>
      {step !== "done" && <StepMeter step={step} />}

      {step === "details" && (
        <form onSubmit={handleDetailsSubmit}>
          <div className="eyebrow">Log a set</div>
          <h1 className="display" style={{ fontSize: "1.8rem", margin: "0.3rem 0 1.6rem" }}>
            What did you hear?
          </h1>

          <div className="field">
            <label htmlFor="artist">Artist</label>
            <input
              id="artist"
              value={draft.artist}
              onChange={(e) => setDraft({ ...draft, artist: e.target.value })}
              placeholder="e.g. Jamie xx (or Artist b2b Artist)"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="event">Venue / festival</label>
            <input
              id="event"
              value={draft.event}
              onChange={(e) => setDraft({ ...draft, event: e.target.value })}
              placeholder="e.g. Terminal 5, NYC"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="genre">Genre (optional)</label>
            <input
              id="genre"
              value={draft.genre}
              onChange={(e) => setDraft({ ...draft, genre: e.target.value })}
              placeholder="e.g. Deep house"
            />
          </div>
          <div className="field">
            <label htmlFor="note">Note (optional)</label>
            <textarea
              id="note"
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              placeholder="Anything worth remembering about the set"
            />
          </div>

          <button type="submit" className="sticker-btn" style={{ width: "100%" }}>
            Next: rate it
          </button>
        </form>
      )}

      {step === "bucket" && (
        <div>
          <div className="eyebrow">Log a set</div>
          <h1 className="display" style={{ fontSize: "1.8rem", margin: "0.3rem 0 0.4rem" }}>
            First take?
          </h1>
          <p style={{ color: "var(--bone-dim)", marginBottom: "1.6rem" }}>
            {draft.artist} — {draft.event}
          </p>
          <button className="bucket-btn" onClick={() => chooseBucket("loved")}>
            <span>{BUCKET_LABEL.loved}</span>
            <span>♥</span>
          </button>
          <button className="bucket-btn" onClick={() => chooseBucket("good")}>
            <span>{BUCKET_LABEL.good}</span>
          </button>
          <button className="bucket-btn" onClick={() => chooseBucket("not")}>
            <span>{BUCKET_LABEL.not}</span>
          </button>
        </div>
      )}

      {step === "compare" && target && (
        <div>
          <div className="eyebrow">Log a set</div>
          <h1 className="display" style={{ fontSize: "1.8rem", margin: "0.3rem 0 0.4rem" }}>
            Which was better?
          </h1>
          <p style={{ color: "var(--bone-dim)" }}>
            Comparison {comparisons + 1} of up to {MAX_COMPARISONS}
          </p>
          <div className="vs-grid">
            <div className="vs-card" onClick={() => answerCompare(true)}>
              <div className="name">{draft.artist}</div>
              <div className="place">{draft.event}</div>
            </div>
            <div className="vs-or">VS</div>
            <div className="vs-card" onClick={() => answerCompare(false)}>
              <div className="name">{target.artist}</div>
              <div className="place">{target.event}</div>
            </div>
          </div>
        </div>
      )}

      {step === "done" && savedLog && (
        <div className="score-reveal">
          <div className="eyebrow">Logged</div>
          <div className="big-score">{savedLog.score.toFixed(1)}</div>
          <p style={{ color: "var(--bone-dim)", marginTop: "0.4rem" }}>
            {savedLog.artist} — {savedLog.event}
          </p>
          <div
            style={{
              display: "flex",
              gap: "0.8rem",
              justifyContent: "center",
              marginTop: "1.8rem",
              flexWrap: "wrap",
            }}
          >
            <button className="sticker-btn" onClick={() => navigate(`/set/${savedLog.id}`)}>
              View set
            </button>
            <button
              className="ghost-btn"
              onClick={() => {
                setDraft(EMPTY_DRAFT);
                setBucket(null);
                setSavedLog(null);
                setStep("details");
              }}
            >
              Log another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepMeter({ step }: { step: Step }) {
  const order: Step[] = ["details", "bucket", "compare"];
  const idx = order.indexOf(step);
  return (
    <div className="chip-row">
      {["Details", "Rate", "Compare"].map((label, i) => (
        <span key={label} className={`chip ${i === idx ? "active" : ""}`}>
          {label}
        </span>
      ))}
    </div>
  );
}
