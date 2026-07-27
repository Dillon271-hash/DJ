import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEncoreStore } from "../lib/store";
import { fetchArtistImage } from "../lib/artistImage";
import { fetchArtistBio } from "../lib/artistBio";
import { RateSheet } from "../components/RateSheet";
import { ScorePill } from "../components/ScorePill";
import { VenueAutocomplete } from "../components/VenueAutocomplete";
import type { DraftLog } from "../lib/types";

export function ArtistPage() {
  const { name } = useParams();
  const artist = decodeURIComponent(name ?? "").trim();
  const navigate = useNavigate();

  const logs = useEncoreStore((s) => s.logs);
  const festivalSession = useEncoreStore((s) => s.festivalSession);
  const clearFestivalSession = useEncoreStore((s) => s.clearFestivalSession);
  const artistLogs = useMemo(
    () =>
      [...logs]
        .filter((l) => l.artist.trim().toLowerCase() === artist.toLowerCase())
        .sort((a, b) => b.score - a.score),
    [logs, artist],
  );

  const [image, setImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setImage(null);
    setImageLoading(true);
    fetchArtistImage(artist, controller.signal).then((url) => {
      // A stale run (e.g. React StrictMode's double-invoke in dev, or a
      // fast artist-to-artist navigation) can still resolve after being
      // aborted — only the run whose signal is still live gets to touch
      // state, so a slow stale request can't flip the loading gate back
      // off early or paint the wrong artist's photo.
      if (controller.signal.aborted) return;
      setImage(url);
      setImageLoading(false);
    });
    return () => controller.abort();
  }, [artist]);

  // Bio coverage is much spottier than photo coverage (plenty of working
  // DJs have no Wikipedia article at all), so unlike the photo this
  // doesn't gate the page — it just fills in whenever/if it resolves.
  const [bio, setBio] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setBio(null);
    fetchArtistBio(artist, controller.signal).then((text) => {
      if (controller.signal.aborted) return;
      setBio(text);
    });
    return () => controller.abort();
  }, [artist]);

  const [showForm, setShowForm] = useState(false);
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState(todayISO());
  const [sheetDraft, setSheetDraft] = useState<DraftLog | null>(null);

  function handleContinue(e: FormEvent) {
    e.preventDefault();
    if (!venue.trim() || !date) return;
    setSheetDraft({ artist, event: venue.trim(), date });
  }

  function logFromFestivalSession() {
    if (!festivalSession) return;
    setSheetDraft({ artist, event: festivalSession.event, date: festivalSession.date });
  }

  if (sheetDraft) {
    const usingSession = festivalSession && sheetDraft.event === festivalSession.event && sheetDraft.date === festivalSession.date;
    return (
      <RateSheet
        draft={sheetDraft}
        presetVenue={usingSession ? { bucket: festivalSession.venueBucket, score: festivalSession.venueScore } : undefined}
        onClose={() => setSheetDraft(null)}
        onDone={(id) => navigate(`/set/${id}`)}
        onLogAnother={() => navigate("/log")}
      />
    );
  }

  if (imageLoading) {
    return (
      <div className="page-loading">
        <span className="mark lg pulse" aria-hidden="true" />
        <p className="eyebrow">Loading {artist}…</p>
      </div>
    );
  }

  const count = artistLogs.length;
  const avg = count ? artistLogs.reduce((sum, l) => sum + l.score, 0) / count : null;
  const best = count ? artistLogs[0].score : null;

  return (
    <div>
      <button className="artist-back" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="artist-hero">
        <div className="artist-avatar">
          {image ? (
            <img src={image} alt={artist} referrerPolicy="no-referrer" onError={() => setImage(null)} />
          ) : (
            <span className="initials">{initials(artist)}</span>
          )}
        </div>
        <h1 className="display artist-name">{artist}</h1>
      </div>

      {bio && <p className="artist-bio">{bio}</p>}

      {count > 0 ? (
        <div className="artist-stats">
          <div className="stat">
            <b>{count}</b>
            <span>Set{count === 1 ? "" : "s"} logged</span>
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
          You haven't logged a set by {artist} yet.
        </p>
      )}

      {!showForm && festivalSession && (
        <div className="festival-session-card">
          <p>
            Logging from <b>{festivalSession.event}</b> · {formatDate(festivalSession.date)}
          </p>
          <div style={{ display: "flex", gap: "0.7rem" }}>
            <button className="sticker-btn" style={{ flex: 1 }} onClick={logFromFestivalSession}>
              Log {artist} here
            </button>
            <button className="ghost-btn" onClick={() => setShowForm(true)}>
              Different venue
            </button>
          </div>
          <button className="text-btn" style={{ display: "block", margin: "0.6rem auto 0" }} onClick={clearFestivalSession}>
            Done with {festivalSession.event}
          </button>
        </div>
      )}

      {!showForm && !festivalSession ? (
        <button className="sticker-btn" style={{ width: "100%" }} onClick={() => setShowForm(true)}>
          Log a set by {artist}
        </button>
      ) : showForm ? (
        <form onSubmit={handleContinue}>
          <div className="field">
            <label htmlFor="venue">Venue / festival</label>
            <VenueAutocomplete
              id="venue"
              value={venue}
              onChange={setVenue}
              placeholder="e.g. Terminal 5, NYC"
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="set-date">Date</label>
            <input
              id="set-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div style={{ display: "flex", gap: "0.7rem" }}>
            <button type="submit" className="sticker-btn" style={{ flex: 1 }}>
              Continue
            </button>
            <button type="button" className="ghost-btn" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {count > 0 && (
        <>
          <hr className="perf" style={{ margin: "1.8rem 0 0.6rem" }} />
          <div className="eyebrow" style={{ margin: "0 0 0.4rem" }}>
            Sets you've logged
          </div>
          <div>
            {artistLogs.map((log) => (
              <Link key={log.id} to={`/set/${log.id}`} className="rank-row">
                <div className="info">
                  <div className="who">{log.event}</div>
                  <div className="meta">{formatDate(log.date)}</div>
                </div>
                <ScorePill score={log.score} bucket={log.bucket} />
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

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
