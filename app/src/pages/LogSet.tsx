import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEncoreStore } from "../lib/store";
import { SEED_ARTISTS } from "../lib/artists";
import { AvatarThumb } from "../components/AvatarThumb";

interface RecentArtist {
  artist: string;
  count: number;
  lastEvent: string;
}

export function LogSet() {
  const logs = useEncoreStore((s) => s.logs);
  const festivalSession = useEncoreStore((s) => s.festivalSession);
  const clearFestivalSession = useEncoreStore((s) => s.clearFestivalSession);
  const navigate = useNavigate();

  const [query, setQuery] = useState("");

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

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const known = new Set(recents.map((r) => r.artist.toLowerCase()));
    return SEED_ARTISTS.filter((name) => !known.has(name.toLowerCase()) && name.toLowerCase().includes(q)).slice(
      0,
      6,
    );
  }, [recents, query]);

  function goToArtist(artist: string) {
    navigate(`/artist/${encodeURIComponent(artist.trim())}`);
  }

  return (
    <div>
      <div className="eyebrow">Log a set</div>
      <h1 className="display" style={{ fontSize: "1.8rem", margin: "0.3rem 0 1.4rem" }}>
        Who'd you hear?
      </h1>

      {festivalSession && (
        <div className="festival-session-card">
          <p>
            Adding sets from <b>{festivalSession.event}</b> — search for the next artist you saw there.
          </p>
          <button className="text-btn" onClick={clearFestivalSession}>
            Done with {festivalSession.event}
          </button>
        </div>
      )}

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
        <button className="add-new-row" onClick={() => goToArtist(query)}>
          + Log “{query.trim()}” as a new artist
        </button>
      )}

      {filteredRecents.length > 0 && (
        <>
          <div className="eyebrow" style={{ margin: "1.4rem 0 0.4rem" }}>
            {query.trim() ? "Matching artists" : "Recent artists"}
          </div>
          <div>
            {filteredRecents.map((r) => (
              <button key={r.artist} className="recent-row" onClick={() => goToArtist(r.artist)}>
                <AvatarThumb name={r.artist} />
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

      {suggestions.length > 0 && (
        <>
          <div className="eyebrow" style={{ margin: "1.4rem 0 0.4rem" }}>
            Suggested artists
          </div>
          <div>
            {suggestions.map((name) => (
              <button key={name} className="recent-row" onClick={() => goToArtist(name)}>
                <AvatarThumb name={name} />
                <span className="info">
                  <span className="who">{name}</span>
                </span>
                <span className="plus">+</span>
              </button>
            ))}
          </div>
        </>
      )}

      {!query.trim() && filteredRecents.length === 0 && (
        <p style={{ color: "var(--smoke)", fontSize: "0.85rem" }}>
          Search for an artist you've heard, or start typing a name to add someone new.
        </p>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
