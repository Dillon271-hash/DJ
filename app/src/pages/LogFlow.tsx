import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEncoreStore } from "../lib/store";
import { bucketRange, finalizeScore, rankInBucket } from "../lib/ranking";
import { splitVenue, venueCandidates } from "../lib/venueNames";
import { uploadSetMedia } from "../lib/mediaUpload";
import { BUCKET_LABEL, type Bucket, type SetLog } from "../lib/types";
import { AvatarThumb } from "../components/AvatarThumb";
import { BucketIcon, BucketPicker } from "../components/BucketPicker";
import { ComparePicker, type CompareItem } from "../components/ComparePicker";
import { VenuePicker } from "../components/VenuePicker";
import { WithWhoInput, type WithTag } from "../components/WithWhoInput";
import { Busy } from "../components/Vinyl";

type Step = "where" | "bucket" | "compare" | "venue-bucket" | "venue-compare" | "details" | "done";

const PHASES = ["Where", "The set", "The venue", "Details"] as const;
const PHASE_OF: Record<Step, number> = {
  where: 0,
  bucket: 1,
  compare: 1,
  "venue-bucket": 2,
  "venue-compare": 2,
  details: 3,
  done: 4,
};

const RANK_PHRASE: Record<Bucket, string> = {
  loved: "sets you loved",
  good: "sets that were good",
  not: "sets that weren't for you",
};

// Long enough to see the chosen bucket light up before the page moves on.
const ADVANCE_MS = 280;

/** The whole log-a-set process as full-screen steps: where & when → how
 * was it → compare against your other sets → the same for the venue →
 * who you were with, notes, photos → score reveal. */
export function LogFlow() {
  const { artist: artistParam } = useParams();
  const artist = decodeURIComponent(artistParam ?? "").trim();
  const navigate = useNavigate();

  const logs = useEncoreStore((s) => s.logs);
  const addLog = useEncoreStore((s) => s.addLog);
  const userId = useEncoreStore((s) => s.session?.user.id);
  const festivalSession = useEncoreStore((s) => s.festivalSession);
  const setFestivalSession = useEncoreStore((s) => s.setFestivalSession);

  // Adding another DJ from the same festival visit starts with the venue
  // and date already filled in (one tap to confirm, or change them).
  const [event, setEvent] = useState(festivalSession?.event ?? "");
  const [date, setDate] = useState(festivalSession?.date ?? todayISO());
  const [stack, setStack] = useState<Step[]>(["where"]);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const step = stack[stack.length - 1];

  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [artistScore, setArtistScore] = useState<number | null>(null);
  const [venueBucket, setVenueBucket] = useState<Bucket | null>(null);
  const [venueScore, setVenueScore] = useState<number | null>(null);

  const [tags, setTags] = useState<WithTag[]>([]);
  const [note, setNote] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SetLog | null>(null);

  const advanceTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

  const venue = splitVenue(event);
  // Same visit as the festival session → its venue score carries over and
  // the venue steps are skipped.
  const preset =
    festivalSession && festivalSession.event === event && festivalSession.date === date ? festivalSession : null;

  function go(next: Step, { replace = false } = {}) {
    setDirection("forward");
    setStack((s) => (replace ? [...s.slice(0, -1), next] : [...s, next]));
  }

  function back() {
    if (stack.length <= 1) return close();
    setDirection("back");
    setStack((s) => s.slice(0, -1));
  }

  function close() {
    const started = bucket !== null || tags.length > 0 || note.trim() || mediaFiles.length > 0;
    if (step !== "done" && started && !window.confirm("Discard this log?")) return;
    navigate(-1);
  }

  // ---- The set ----
  const artistCandidates = useMemo<CompareItem[]>(
    () =>
      bucket
        ? logs
            .filter((l) => l.bucket === bucket)
            .map((l) => ({ id: l.id, score: l.score, title: l.artist, subtitle: `${splitVenue(l.event).name} · ${shortDate(l.date)}` }))
        : [],
    [logs, bucket],
  );

  function pickBucket(b: Bucket) {
    setBucket(b);
    window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => {
      const candidates = logs.filter((l) => l.bucket === b);
      if (candidates.length === 0) finishArtist(finalizeScore(...bucketRange(b), []));
      else go("compare");
    }, ADVANCE_MS);
  }

  function finishArtist(score: number) {
    setArtistScore(score);
    if (preset) {
      setVenueBucket(preset.venueBucket);
      setVenueScore(preset.venueScore);
      go("details", { replace: step === "compare" });
    } else {
      go("venue-bucket", { replace: step === "compare" });
    }
  }

  // ---- The venue ----
  const venueItems = useMemo<CompareItem[]>(
    () =>
      venueBucket
        ? venueCandidates(logs, venueBucket, event).map((c) => {
            const v = splitVenue(c.event);
            return { id: c.id, score: c.score, title: v.name, subtitle: v.place };
          })
        : [],
    [logs, venueBucket, event],
  );

  function pickVenueBucket(b: Bucket) {
    setVenueBucket(b);
    window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => {
      if (venueCandidates(logs, b, event).length === 0) finishVenue(finalizeScore(...bucketRange(b), []));
      else go("venue-compare");
    }, ADVANCE_MS);
  }

  function finishVenue(score: number) {
    setVenueScore(score);
    go("details", { replace: step === "venue-compare" });
  }

  // ---- Save ----
  async function save() {
    if (!bucket || artistScore === null || !venueBucket || venueScore === null || saving) return;
    setSaving(true);
    setSaveError(null);
    const mediaPaths = userId && mediaFiles.length > 0 ? await uploadSetMedia(mediaFiles, userId) : [];
    const entry = await addLog(
      {
        artist,
        event,
        date,
        withWho: tags.length ? tags.map((t) => t.name).join(", ") : undefined,
        withUserIds: tags.flatMap((t) => (t.userId ? [t.userId] : [])),
        note: note.trim() || undefined,
      },
      bucket,
      artistScore,
      venueBucket,
      venueScore,
      mediaPaths,
    );
    setSaving(false);
    if (!entry) {
      setSaveError("Couldn't save that set — check your connection and try again.");
      return;
    }
    // Keeps (or starts) the festival session so the next DJ from this same
    // visit skips the venue steps with this same venue score.
    setFestivalSession({ event, date, venueBucket, venueScore });
    setSaved(entry);
    setDirection("forward");
    setStack(["done"]);
  }

  const phase = PHASE_OF[step];

  return (
    <div className="flow" role="dialog" aria-modal="true" aria-label={`Log a set by ${artist}`}>
      {step !== "done" && (
        <header className="flow-top">
          <button type="button" className="flow-icon-btn" onClick={back} aria-label="Back">
            ←
          </button>
          <ol className="flow-phases" aria-label="Progress">
            {PHASES.map((p, i) => (
              <li
                key={p}
                className={`${i < phase ? "done" : i === phase ? "current" : ""} ${i === 2 && preset ? "skipped" : ""}`}
                aria-current={i === phase ? "step" : undefined}
              >
                {p}
              </li>
            ))}
          </ol>
          <button type="button" className="flow-icon-btn" onClick={close} aria-label="Close">
            ✕
          </button>
        </header>
      )}

      {step !== "done" && (
        <div className="flow-subject">
          <AvatarThumb name={artist} />
          <div>
            <div className="flow-subject-name">{artist}</div>
            <div className="flow-subject-meta">{event ? `${venue.name} · ${shortDate(date)}` : "New set"}</div>
          </div>
        </div>
      )}

      <main className={`flow-body ${direction}`} key={step}>
        {step === "where" && (
          <>
            <h1 className="flow-title">Where'd you see them?</h1>
            {event ? (
              <>
                <div className="where-picked">
                  <div>
                    <div className="where-picked-name">{venue.name}</div>
                    {venue.place && <div className="where-picked-place">{venue.place}</div>}
                  </div>
                  <button type="button" className="text-btn" onClick={() => setEvent("")}>
                    Change
                  </button>
                </div>
                {preset && <p className="flow-hint">Still at {venue.name}? Your venue rating from earlier carries over.</p>}

                <div className="flow-label">When</div>
                <div className="chip-row">
                  {[0, 1, 2].map((daysAgo) => {
                    const iso = offsetISO(daysAgo);
                    return (
                      <button key={daysAgo} type="button" className={`chip ${date === iso ? "active" : ""}`} onClick={() => setDate(iso)}>
                        {daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : "2 days ago"}
                      </button>
                    );
                  })}
                  <input
                    type="date"
                    className="date-input"
                    value={date}
                    max={todayISO()}
                    onChange={(e) => e.target.value && setDate(e.target.value)}
                    aria-label="Pick a date"
                  />
                </div>

                <div className="flow-footer">
                  <button type="button" className="sticker-btn" onClick={() => go("bucket")}>
                    Next
                  </button>
                </div>
              </>
            ) : (
              <VenuePicker onSelect={setEvent} />
            )}
          </>
        )}

        {step === "bucket" && (
          <>
            <h1 className="flow-title">How was {artist}?</h1>
            <BucketPicker context="set" selected={bucket} onPick={pickBucket} />
          </>
        )}

        {step === "compare" && bucket && (
          <>
            <h1 className="flow-title">Which set was better?</h1>
            <p className="flow-hint">Tap the one you liked more.</p>
            <ComparePicker
              kind="artist"
              subject={{ title: artist, subtitle: venue.name }}
              candidates={artistCandidates}
              range={bucketRange(bucket)}
              onDone={finishArtist}
            />
          </>
        )}

        {step === "venue-bucket" && (
          <>
            <h1 className="flow-title">How was {venue.name}?</h1>
            <p className="flow-hint">The room, the sound, the crowd — not the DJ.</p>
            <BucketPicker context="venue" selected={venueBucket} onPick={pickVenueBucket} />
          </>
        )}

        {step === "venue-compare" && venueBucket && (
          <>
            <h1 className="flow-title">Which venue was better?</h1>
            <p className="flow-hint">Tap the one you liked more.</p>
            <ComparePicker
              kind="venue"
              subject={{ title: venue.name, subtitle: venue.place }}
              candidates={venueItems}
              range={bucketRange(venueBucket)}
              onDone={finishVenue}
            />
          </>
        )}

        {step === "details" && (
          <>
            <h1 className="flow-title">The details</h1>
            <p className="flow-hint">All optional.</p>

            <div className="flow-label">Who were you with?</div>
            <WithWhoInput tags={tags} onChange={setTags} />

            <div className="flow-label">Notes</div>
            <textarea
              className="flow-textarea"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="The track that hit, the moment you'll remember…"
            />

            <div className="flow-label">Photos & videos</div>
            {mediaFiles.length > 0 && (
              <div className="media-preview-row">
                {mediaFiles.map((file, i) => (
                  <MediaPreview key={`${file.name}-${i}`} file={file} onRemove={() => setMediaFiles((f) => f.filter((_, j) => j !== i))} />
                ))}
              </div>
            )}
            <label className="media-picker">
              + Add photo or video
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []);
                  if (picked.length) setMediaFiles((prev) => [...prev, ...picked]);
                  e.target.value = "";
                }}
                style={{ display: "none" }}
              />
            </label>

            {saveError && <p className="flow-error">{saveError}</p>}

            <div className="flow-footer">
              <button type="button" className="sticker-btn" onClick={save} disabled={saving}>
                {saving ? <Busy>{mediaFiles.length ? "Uploading…" : "Saving…"}</Busy> : "Save set"}
              </button>
            </div>
          </>
        )}

        {step === "done" && saved && (
          <ScoreReveal
            log={saved}
            logs={logs}
            onView={() => navigate(`/set/${saved.id}`, { replace: true })}
            onAnother={() => navigate("/log", { replace: true })}
          />
        )}
      </main>
    </div>
  );
}

function ScoreReveal({ log, logs, onView, onAnother }: { log: SetLog; logs: SetLog[]; onView: () => void; onAnother: () => void }) {
  const [shown, setShown] = useState(0);

  // Count up to the score while the ring fills.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(log.score);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 900);
      setShown(log.score * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [log.score]);

  const inBucket = logs.filter((l) => l.bucket === log.bucket).length;
  const rank = rankInBucket(logs, log.bucket, log.id);
  const venue = splitVenue(log.event);

  return (
    <div className="reveal">
      <div className="eyebrow">Logged</div>
      <div className={`reveal-ring ${log.bucket}`} style={{ ["--p" as string]: shown / 10 }}>
        <span className="reveal-score">{shown.toFixed(1)}</span>
      </div>
      <div className="reveal-artist">{log.artist}</div>
      <div className={`reveal-bucket ${log.bucket}`}>
        <BucketIcon bucket={log.bucket} />
        {BUCKET_LABEL[log.bucket]}
      </div>
      <p className="reveal-rank">
        {inBucket > 1 ? `#${rank} of the ${inBucket} ${RANK_PHRASE[log.bucket]}` : `Your first "${BUCKET_LABEL[log.bucket]}" set`}
      </p>
      {log.venueScore !== undefined && log.venueBucket && (
        <div className="reveal-venue">
          {venue.name}
          <span className={`pill ${log.venueBucket}`}>{log.venueScore.toFixed(1)}</span>
        </div>
      )}
      <div className="reveal-actions">
        <button type="button" className="sticker-btn" onClick={onView}>
          View set
        </button>
        <button type="button" className="ghost-btn" onClick={onAnother}>
          + Another DJ from {venue.name}
        </button>
      </div>
    </div>
  );
}

function MediaPreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImage = file.type.startsWith("image/");
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file, isImage]);

  return (
    <div className="media-preview">
      {isImage && url ? <img src={url} alt="" /> : <span className="media-preview-icon" aria-hidden="true">🎥</span>}
      <button type="button" className="media-preview-remove" onClick={onRemove} aria-label={`Remove ${file.name}`}>
        ✕
      </button>
    </div>
  );
}

function todayISO(): string {
  return offsetISO(0);
}

// Local calendar date (not UTC — toISOString() would roll over to
// "tomorrow" in the evening for anyone west of Greenwich).
function offsetISO(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
