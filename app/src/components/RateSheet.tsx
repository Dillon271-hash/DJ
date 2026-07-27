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

type Phase = "rate" | "compare" | "venue-rate" | "venue-compare" | "done";

interface VenueCandidate {
  id: string;
  score: number;
  event: string;
}

export function RateSheet({
  draft,
  presetVenue,
  onClose,
  onDone,
  onLogAnother,
}: {
  draft: DraftLog;
  // When set (logging another DJ from a festival visit already rated
  // this session), the venue-rate/venue-compare phases are skipped
  // entirely and every set saved during the session reuses this score.
  presetVenue?: { bucket: Bucket; score: number };
  onClose: () => void;
  onDone: (id: string) => void;
  onLogAnother?: () => void;
}) {
  const logs = useEncoreStore((s) => s.logs);
  const addLog = useEncoreStore((s) => s.addLog);
  const setFestivalSession = useEncoreStore((s) => s.setFestivalSession);

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
  const [artistScore, setArtistScore] = useState<number | null>(null);

  const [venueBucket, setVenueBucket] = useState<Bucket | null>(null);
  const [venueRange, setVenueRange] = useState<[number, number]>([0, 10]);
  const [venueExcludeIds, setVenueExcludeIds] = useState<Set<string>>(new Set());
  const [venueTarget, setVenueTarget] = useState<VenueCandidate | null>(null);
  const [venueComparisons, setVenueComparisons] = useState(0);

  const [savedLog, setSavedLog] = useState<SetLog | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
      finishArtist(finalizeScore(lo, hi, []));
      return;
    }
    const first = pickComparisonTarget(candidates, lo, hi, new Set());
    if (!first) {
      finishArtist(finalizeScore(lo, hi, candidates.map((c) => c.score)));
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
      finishArtist(finalizeScore(lo, hi, candidates.map((c) => c.score)));
      return;
    }
    const next = pickComparisonTarget(candidates, lo, hi, nextExclude);
    if (!next) {
      finishArtist(finalizeScore(lo, hi, candidates.map((c) => c.score)));
      return;
    }
    setRange([lo, hi]);
    setTarget(next);
    setExcludeIds(nextExclude);
    setComparisons(nextComparisons);
  }

  // Artist score is settled. With a preset venue score already in hand
  // (logging another DJ from the same festival visit) the log can save
  // immediately; otherwise the venue still needs its own rating pass
  // before addLog fires, with both scores. The score is passed straight
  // through to finishVenue rather than relying on the artistScore state
  // update having landed yet — setArtistScore above wouldn't be visible
  // to a finishVenue call made synchronously in the same tick.
  function finishArtist(score: number) {
    setArtistScore(score);
    if (presetVenue) {
      finishVenue(presetVenue.bucket, presetVenue.score, score);
      return;
    }
    setPhase("venue-rate");
  }

  function venueCandidatesFor(bucket: Bucket): VenueCandidate[] {
    return logs
      .filter((l) => l.venueBucket === bucket && l.venueScore !== undefined)
      .map((l) => ({ id: l.id, score: l.venueScore as number, event: l.event }));
  }

  function chooseVenueBucket(chosen: Bucket) {
    if (saving) return;
    setSaveError(null);
    setVenueBucket(chosen);
    const [lo, hi] = bucketRange(chosen);
    const candidates = venueCandidatesFor(chosen);

    if (candidates.length === 0) {
      finishVenue(chosen, finalizeScore(lo, hi, []));
      return;
    }
    const first = pickComparisonTarget(candidates, lo, hi, new Set());
    if (!first) {
      finishVenue(chosen, finalizeScore(lo, hi, candidates.map((c) => c.score)));
      return;
    }
    setVenueRange([lo, hi]);
    setVenueTarget(first);
    setVenueExcludeIds(new Set());
    setVenueComparisons(0);
    setPhase("venue-compare");
  }

  function answerVenueCompare(newVenueWasBetter: boolean) {
    if (!venueBucket || !venueTarget || saving) return;
    setSaveError(null);
    const [lo, hi] = narrowRange(venueRange[0], venueRange[1], venueTarget, newVenueWasBetter);
    const nextExclude = new Set(venueExcludeIds).add(venueTarget.id);
    const nextComparisons = venueComparisons + 1;
    const candidates = venueCandidatesFor(venueBucket);

    if (nextComparisons >= MAX_COMPARISONS) {
      finishVenue(venueBucket, finalizeScore(lo, hi, candidates.map((c) => c.score)));
      return;
    }
    const next = pickComparisonTarget(candidates, lo, hi, nextExclude);
    if (!next) {
      finishVenue(venueBucket, finalizeScore(lo, hi, candidates.map((c) => c.score)));
      return;
    }
    setVenueRange([lo, hi]);
    setVenueTarget(next);
    setVenueExcludeIds(nextExclude);
    setVenueComparisons(nextComparisons);
  }

  async function finishVenue(chosenVenueBucket: Bucket, venueScore: number, artistScoreOverride?: number) {
    const finalArtistScore = artistScoreOverride ?? artistScore;
    if (!bucket || finalArtistScore === null) return;
    setSaving(true);
    const entry = await addLog(finalDraft(), bucket, finalArtistScore, chosenVenueBucket, venueScore);
    setSaving(false);
    if (!entry) {
      setSaveError("Couldn't save that set — check your connection and try again.");
      return;
    }
    // Keeps (or starts) the festival session so the next "log another DJ"
    // pass skips straight to artist-only rating with this same score.
    setFestivalSession({ event: draft.event, date, venueBucket: chosenVenueBucket, venueScore });
    setSavedLog(entry);
    setPhase("done");
  }

  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && phase !== "done" && onClose()}>
      <div className="sheet">
        {saveError && (
          <p style={{ color: "var(--glow-core)", fontSize: "0.85rem", margin: "0 0 0.8rem" }}>{saveError}</p>
        )}
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

        {phase === "venue-rate" && (
          <>
            <div className="sheet-header">
              <div>
                <div className="who">How was the venue?</div>
                <div className="meta">{draft.event}</div>
              </div>
              <button className="sheet-close" onClick={onClose} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="sheet-section">
              <div className="circle-row">
                <CircleButton
                  kind="loved"
                  label={BUCKET_LABEL.loved}
                  selected={false}
                  onClick={() => chooseVenueBucket("loved")}
                />
                <CircleButton
                  kind="good"
                  label={BUCKET_LABEL.good}
                  selected={false}
                  onClick={() => chooseVenueBucket("good")}
                />
                <CircleButton
                  kind="not"
                  label={BUCKET_LABEL.not}
                  selected={false}
                  onClick={() => chooseVenueBucket("not")}
                />
              </div>
            </div>
          </>
        )}

        {phase === "venue-compare" && venueTarget && (
          <>
            <div className="sheet-header">
              <div>
                <div className="who">Which venue was better?</div>
                <div className="meta">
                  Comparison {venueComparisons + 1} of up to {MAX_COMPARISONS}
                </div>
              </div>
              <button className="sheet-close" onClick={onClose} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="vs-grid">
              <div className="vs-card" onClick={() => answerVenueCompare(true)}>
                <div className="name">{draft.event}</div>
              </div>
              <div className="vs-or">VS</div>
              <div className="vs-card" onClick={() => answerVenueCompare(false)}>
                <div className="name">{venueTarget.event}</div>
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
            {savedLog.venueScore !== undefined && (
              <div className="score-demo" style={{ justifyContent: "center", marginTop: "1rem" }}>
                <span className={`pill ${savedLog.venueBucket}`}>Venue {savedLog.venueScore.toFixed(1)}</span>
              </div>
            )}
            <div style={{ display: "flex", gap: "0.7rem", marginTop: "1.6rem", justifyContent: "center" }}>
              <button className="sticker-btn" onClick={() => onDone(savedLog.id)}>
                View set
              </button>
              {onLogAnother && (
                <button className="ghost-btn" onClick={onLogAnother}>
                  + Log another from {draft.event}
                </button>
              )}
            </div>
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
