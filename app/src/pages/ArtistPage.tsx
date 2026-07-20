import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEncoreStore } from "../lib/store";
import { fetchArtistImage } from "../lib/artistImage";
import { RateSheet } from "../components/RateSheet";
import { ScorePill } from "../components/ScorePill";
import type { DraftLog } from "../lib/types";

export function ArtistPage() {
  const { name } = useParams();
  const artist = decodeURIComponent(name ?? "").trim();
  const navigate = useNavigate();

  const logs = useEncoreStore((s) => s.logs);
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
    fetchArtistImage(artist, controller.signal)
      .then((url) => setImage(url))
      .finally(() => setImageLoading(false));
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

  if (sheetDraft) {
    return (
      <RateSheet
        draft={sheetDraft}
        onClose={() => setSheetDraft(null)}
        onDone={(id) => navigate(`/set/${id}`)}
      />
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
        <div className={`artist-avatar ${imageLoading ? "loading" : ""}`}>
          {image ? (
            <img src={image} alt={artist} referrerPolicy="no-referrer" onError={() => setImage(null)} />
          ) : (
            <span className="initials">{initials(artist)}</span>
          )}
        </div>
        <h1 className="display artist-name">{artist}</h1>
      </div>

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

      {!showForm ? (
        <button className="sticker-btn" style={{ width: "100%" }} onClick={() => setShowForm(true)}>
          Log a set by {artist}
        </button>
      ) : (
        <form onSubmit={handleContinue}>
          <div className="field">
            <label htmlFor="venue">Venue / festival</label>
            <input
              id="venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Terminal 5, NYC"
              autoFocus
              required
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
      )}

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
