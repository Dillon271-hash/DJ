import { useState } from "react";
import { useEncoreStore } from "../lib/store";
import {
  MAX_COMPARISONS,
  bucketRange,
  finalizeScore,
  narrowRange,
  pickComparisonTarget,
} from "../lib/ranking";
import { BUCKET_LABEL, LABEL_PRESETS, type Bucket, type DraftLog, type SetLog } from "../lib/types";

type Phase = "rate" | "compare" | "done";

export function RateSheet({
  draft,
  onClose,
  onDone,
}: {
  draft: DraftLog;
  onClose: () => void;
  onDone: (id: string) => void;
}) {
  const logs = useEncoreStore((s) => s.logs);
  const addLog = useEncoreStore((s) => s.addLog);

  const [phase, setPhase] = useState<Phase>("rate");
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [labels, setLabels] = useState<string[]>(draft.labels ?? []);
  const [customLabel, setCustomLabel] = useState("");
  const [withWhoTags, setWithWhoTags] = useState<string[]>([]);
  const [whoInput, setWhoInput] = useState("");
  const [note, setNote] = useState(draft.note ?? "");
  const [date, setDate] = useState(draft.date);

  const [range, setRange] = useState<[number, number]>([0, 10]);
  const [excludeIds, setExcludeIds] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<SetLog | null>(null);
  const [comparisons, setComparisons] = useState(0);
  const [savedLog, setSavedLog] = useState<SetLog | null>(null);

  function toggleLabel(l: string) {
    setLabels((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));
  }

  function addCustomLabel() {
    const v = customLabel.trim();
    if (v && !labels.includes(v)) setLabels([...labels, v]);
    setCustomLabel("");
  }

  function addWhoTag() {
    const v = whoInput.trim();
    if (v && !withWhoTags.includes(v)) setWithWhoTags([...withWhoTags, v]);
    setWhoInput("");
  }

  function removeWhoTag(v: string) {
    setWithWhoTags(withWhoTags.filter((t) => t !== v));
  }

  function finalDraft(): DraftLog {
    return {
      ...draft,
      date,
      labels: labels.length ? labels : undefined,
      withWho: withWhoTags.length ? withWhoTags.join(", ") : undefined,
      note: note.trim() || undefined,
    };
  }

  function handleOkay() {
    if (!bucket) return;
    const [lo, hi] = bucketRange(bucket);
    const candidates = logs.filter((l) => l.bucket === bucket);

    if (candidates.length === 0) {
      finish(finalizeScore(lo, hi, []));
      return;
    }
    const first = pickComparisonTarget(candidates, lo, hi, new Set());
    if (!first) {
      finish(finalizeScore(lo, hi, candidates.map((c) => c.score)));
      return;
    }
    setRange([lo, hi]);
    setTarget(first);
    setExcludeIds(new Set());
    setComparisons(0);
    setPhase("compare");
  }

  function answerCompare(newSetWasBetter: boolean) {
    if (!bucket || !target) return;
    const [lo, hi] = narrowRange(range[0], range[1], target, newSetWasBetter);
    const nextExclude = new Set(excludeIds).add(target.id);
    const nextComparisons = comparisons + 1;
    const candidates = logs.filter((l) => l.bucket === bucket);

    if (nextComparisons >= MAX_COMPARISONS) {
      finish(finalizeScore(lo, hi, candidates.map((c) => c.score)));
      return;
    }
    const next = pickComparisonTarget(candidates, lo, hi, nextExclude);
    if (!next) {
      finish(finalizeScore(lo, hi, candidates.map((c) => c.score)));
      return;
    }
    setRange([lo, hi]);
    setTarget(next);
    setExcludeIds(nextExclude);
    setComparisons(nextComparisons);
  }

  function finish(score: number) {
    if (!bucket) return;
    const entry = addLog(finalDraft(), bucket, score);
    setSavedLog(entry);
    setPhase("done");
  }

  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && phase !== "done" && onClose()}>
      <div className="sheet">
        {phase === "rate" && (
          <>
            <div className="sheet-header">
              <div>
                <div className="who">{draft.artist}</div>
                <div className="meta">{draft.event || "New set"}</div>
              </div>
              <button className="sheet-close" onClick={onClose} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="sheet-section">
              <div className="label">How was it?</div>
              <div className="circle-row">
                <CircleButton
                  kind="loved"
                  label={BUCKET_LABEL.loved}
                  selected={bucket === "loved"}
                  onClick={() => setBucket("loved")}
                />
                <CircleButton
                  kind="good"
                  label={BUCKET_LABEL.good}
                  selected={bucket === "good"}
                  onClick={() => setBucket("good")}
                />
                <CircleButton
                  kind="not"
                  label={BUCKET_LABEL.not}
                  selected={bucket === "not"}
                  onClick={() => setBucket("not")}
                />
              </div>
            </div>

            <div className="sheet-section">
              <div className="label">Who were you with?</div>
              <div className="tag-input-row">
                {withWhoTags.map((t) => (
                  <span className="tag-pill" key={t}>
                    {t}
                    <button onClick={() => removeWhoTag(t)} aria-label={`Remove ${t}`}>
                      ✕
                    </button>
                  </span>
                ))}
                <input
                  value={whoInput}
                  onChange={(e) => setWhoInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addWhoTag();
                    }
                  }}
                  onBlur={addWhoTag}
                  placeholder="Add a name, press enter"
                />
              </div>
            </div>

            <div className="sheet-section">
              <div className="label">Add labels</div>
              <div className="chip-row" style={{ marginBottom: "0.6rem" }}>
                {LABEL_PRESETS.map((l) => (
                  <button
                    key={l}
                    className={`chip ${labels.includes(l) ? "active" : ""}`}
                    onClick={() => toggleLabel(l)}
                  >
                    {l}
                  </button>
                ))}
                {labels
                  .filter((l) => !LABEL_PRESETS.includes(l))
                  .map((l) => (
                    <button key={l} className="chip active" onClick={() => toggleLabel(l)}>
                      {l}
                    </button>
                  ))}
              </div>
              <div className="tag-input-row">
                <input
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomLabel();
                    }
                  }}
                  onBlur={addCustomLabel}
                  placeholder="Custom label, press enter"
                />
              </div>
            </div>

            <div className="sheet-section">
              <div className="label">Add notes</div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything worth remembering about the set"
                style={{
                  width: "100%",
                  background: "var(--ink)",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  padding: "0.7rem 0.8rem",
                  color: "var(--bone)",
                  minHeight: "4rem",
                  resize: "vertical",
                }}
              />
            </div>

            <div className="sheet-section">
              <div className="label">When</div>
              <div className="date-chip-row">
                <DateChip label="Today" value={todayISO()} current={date} onPick={setDate} />
                <DateChip label="Yesterday" value={offsetISO(1)} current={date} onPick={setDate} />
                <DateChip label="2 days ago" value={offsetISO(2)} current={date} onPick={setDate} />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{
                    background: "var(--ink)",
                    border: "1px solid var(--line)",
                    borderRadius: 999,
                    padding: "0.4rem 0.7rem",
                    color: "var(--bone)",
                    fontSize: "0.8rem",
                  }}
                />
              </div>
            </div>

            <div className="sheet-footer">
              <button className="sticker-btn" style={{ width: "100%" }} disabled={!bucket} onClick={handleOkay}>
                Okay
              </button>
            </div>
          </>
        )}

        {phase === "compare" && target && (
          <>
            <div className="sheet-header">
              <div>
                <div className="who">Which was better?</div>
                <div className="meta">
                  Comparison {comparisons + 1} of up to {MAX_COMPARISONS}
                </div>
              </div>
              <button className="sheet-close" onClick={onClose} aria-label="Close">
                ✕
              </button>
            </div>
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
          </>
        )}

        {phase === "done" && savedLog && (
          <div className="score-reveal">
            <div className="eyebrow">Logged</div>
            <div className="big-score">{savedLog.score.toFixed(1)}</div>
            <p style={{ color: "var(--bone-dim)", marginTop: "0.4rem" }}>
              {savedLog.artist} — {savedLog.event}
            </p>
            <button className="sticker-btn" style={{ marginTop: "1.6rem" }} onClick={() => onDone(savedLog.id)}>
              View set
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CircleButton({
  kind,
  label,
  selected,
  onClick,
}: {
  kind: Bucket;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`circle-btn ${kind} ${selected ? "selected" : ""}`} onClick={onClick} type="button">
      <span className="dot">{selected ? "✓" : ""}</span>
      <span className="txt">{label}</span>
    </button>
  );
}

function DateChip({
  label,
  value,
  current,
  onPick,
}: {
  label: string;
  value: string;
  current: string;
  onPick: (v: string) => void;
}) {
  return (
    <button className={`chip ${current === value ? "active" : ""}`} onClick={() => onPick(value)} type="button">
      {label}
    </button>
  );
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function offsetISO(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}
