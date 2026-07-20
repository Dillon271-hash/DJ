import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useEncoreStore } from "../lib/store";
import { RateSheet } from "../components/RateSheet";
import { ArtistAutocomplete } from "../components/ArtistAutocomplete";
import type { DraftLog } from "../lib/types";

interface RecentArtist {
  artist: string;
  count: number;
  lastEvent: string;
}

export function LogSet() {
  const logs = useEncoreStore((s) => s.logs);
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<DraftLog | null>(null);
  const [sheetDraft, setSheetDraft] = useState<DraftLog | null>(null);

  const recents = useMemo<RecentArtist[]>(() => {
    const byArtist = new Map<string, RecentArtist>();
    for (const log of [...logs].sort((a, b) => b.createdAt - a.createdAt)) {
      const key = log.artist.trim().toLowerCase();
      const existing = byArtist.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        byArtist.set(key, { artist: log.artist, count: 1, lastEvent: log.event });
      }
    }
    return [...byArtist.values()];
  }, [logs]);

  const filteredRecents = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? recents.filter((r) => r.artist.toLowerCase().includes(q) || r.lastEvent.toLowerCase().includes(q))
      : recents;
    return list.slice(0, 8);
  }, [recents, query]);

  function startFromRecent(artist: string) {
    setPending({ artist, event: "", date: todayISO() });
  }

  function startNew() {
    setPending({ artist: query.trim(), event: "", date: todayISO() });
  }

  function handleDetailsContinue(e: FormEvent) {
    e.preventDefault();
    if (!pending || !pending.artist.trim() || !pending.event.trim() || !pending.date) return;
    setSheetDraft(pending);
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

  if (pending) {
    return (
      <div>
        <div className="eyebrow">Log a set</div>
        <h1 className="display" style={{ fontSize: "1.8rem", margin: "0.3rem 0 1.6rem" }}>
          Where and when?
        </h1>
        <form onSubmit={handleDetailsContinue}>
          <div className="field">
            <label htmlFor="artist">Artist</label>
            <ArtistAutocomplete
              id="artist"
              value={pending.artist}
              onChange={(artist) => setPending({ ...pending, artist })}
              recents={recents.map((r) => r.artist)}
              placeholder="e.g. Jamie xx (or Artist b2b Artist)"
            />
          </div>
          <div className="field">
            <label htmlFor="event">Venue / festival</label>
            <input
              id="event"
              value={pending.event}
              onChange={(e) => setPending({ ...pending, event: e.target.value })}
              placeholder="e.g. Terminal 5, NYC"
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              value={pending.date}
              onChange={(e) => setPending({ ...pending, date: e.target.value })}
              required
            />
          </div>
          <div style={{ display: "flex", gap: "0.7rem" }}>
            <button type="submit" className="sticker-btn" style={{ flex: 1 }}>
              Continue
            </button>
            <button type="button" className="ghost-btn" onClick={() => setPending(null)}>
              Back
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="eyebrow">Log a set</div>
      <h1 className="display" style={{ fontSize: "1.8rem", margin: "0.3rem 0 1.4rem" }}>
        Who'd you hear?
      </h1>

      <div className="search-field">
        <SearchIcon />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search artist, venue, festival"
          autoFocus
        />
      </div>

      {query.trim() && (
        <button className="add-new-row" onClick={startNew}>
          + Log “{query.trim()}” as a new set
        </button>
      )}

      {filteredRecents.length > 0 && (
        <>
          <div className="eyebrow" style={{ margin: "1.4rem 0 0.4rem" }}>
            {query.trim() ? "Matching artists" : "Recent artists"}
          </div>
          <div>
            {filteredRecents.map((r) => (
              <button key={r.artist} className="recent-row" onClick={() => startFromRecent(r.artist)}>
                <span className="icon">{r.artist.charAt(0).toUpperCase()}</span>
                <span className="info">
                  <span className="who">{r.artist}</span>
                  <span className="meta">
                    {r.count} set{r.count === 1 ? "" : "s"} logged · last {r.lastEvent}
                  </span>
                </span>
                <span className="plus">+</span>
              </button>
            ))}
          </div>
        </>
      )}

      {!query.trim() && filteredRecents.length === 0 && (
        <button className="add-new-row" onClick={startNew}>
          + Log a new set
        </button>
      )}
    </div>
  );
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
