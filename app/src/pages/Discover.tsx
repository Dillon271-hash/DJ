import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useEncoreStore } from "../lib/store";
import { useSocial } from "../lib/social";
import { recommend, type CommunityLog, type Rec } from "../lib/recommend";
import { artistsIn, GENRES, normalizeArtist, type Genre } from "../lib/genres";
import { cityName, fetchCityLogs, fetchCommunityLogs, fetchEvents, useCity, type EventsResult, type ShowListing } from "../lib/discover";
import { bucketForScore } from "../lib/ranking";
import type { FeedItem } from "../lib/social";
import { Loader } from "../components/Vinyl";
import { ArtistPhoto } from "../components/ArtistPhoto";
import { ScoreRing } from "../components/ScoreRing";
import { AvatarThumb } from "../components/AvatarThumb";
import { CitySheet, PinIcon } from "../components/CitySheet";
import { SearchAll } from "../components/SearchAll";
import { Doodle } from "../components/Doodle";

export function Discover() {
  const me = useEncoreStore((s) => s.session?.user.id ?? "");
  const myLogs = useEncoreStore((s) => s.logs);
  const plusOnes = useSocial((s) => s.plusOnes);
  const crews = useSocial((s) => s.crews);
  const { city, load: loadCity } = useCity();
  const [community, setCommunity] = useState<CommunityLog[] | null>(null);
  const [events, setEvents] = useState<EventsResult | null>(null);
  const [cityLogs, setCityLogs] = useState<FeedItem[] | null>(null);
  const [pickingCity, setPickingCity] = useState(false);
  const [genre, setGenre] = useState<Genre | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (city === undefined) loadCity();
  }, [city, loadCity]);

  useEffect(() => {
    fetchCommunityLogs().then(setCommunity);
  }, []);

  useEffect(() => {
    if (!city) {
      setEvents(null);
      setCityLogs(null);
      return;
    }
    let stale = false;
    setEvents(null);
    setCityLogs(null);
    fetchEvents({ place: city }).then((r) => !stale && setEvents(r));
    fetchCityLogs(city).then((r) => !stale && setCityLogs(r.filter((i) => i.person.id !== me)));
    return () => {
      stale = true;
    };
  }, [city, me]);

  // Plus-ones and crewmates, so their high scores can be the reason.
  const friends = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of plusOnes?.friends ?? []) m.set(f.id, f.name.split(/\s+/)[0]);
    for (const c of crews?.mine ?? []) for (const p of c.members) if (p.id !== me) m.set(p.id, p.name.split(/\s+/)[0]);
    return m;
  }, [plusOnes, crews, me]);

  const recs = useMemo(
    () => (community ? recommend({ mine: myLogs, community, me, friends, limit: 14 }) : null),
    [community, myLogs, me, friends],
  );

  const mineKeys = useMemo(() => new Set(myLogs.map((l) => normalizeArtist(l.artist))), [myLogs]);
  const lovedKeys = useMemo(() => new Set(myLogs.filter((l) => l.score >= 7).map((l) => normalizeArtist(l.artist))), [myLogs]);
  const recKeys = useMemo(() => new Set(recs?.map((r) => normalizeArtist(r.artist)) ?? []), [recs]);

  // Shows featuring artists you love or were recommended float to the top.
  const shows = useMemo(() => {
    if (!events?.events.length) return [];
    const tag = (e: ShowListing) => {
      const keys = e.artists.map(normalizeArtist);
      if (keys.some((k) => lovedKeys.has(k))) return "loved" as const;
      if (keys.some((k) => recKeys.has(k))) return "rec" as const;
      if (keys.some((k) => mineKeys.has(k))) return "seen" as const;
      return null;
    };
    const order = { loved: 0, rec: 1, seen: 2 } as const;
    return events.events
      .map((e) => ({ ...e, tag: tag(e) }))
      .sort((a, b) => (a.tag ? order[a.tag] : 3) - (b.tag ? order[b.tag] : 3) || (a.date ?? "").localeCompare(b.date ?? ""))
      .slice(0, 20);
  }, [events, lovedKeys, recKeys, mineKeys]);

  const nearDates = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of events?.events ?? []) for (const a of e.artists) if (e.date && !m.has(normalizeArtist(a))) m.set(normalizeArtist(a), e.date);
    return m;
  }, [events]);

  // What Disko people have been seeing in your city, by artist.
  const cityArtists = useMemo(() => {
    if (!cityLogs?.length) return [];
    const by = new Map<string, { name: string; scores: number[]; people: Set<string>; last: number }>();
    for (const { log, person } of cityLogs) {
      const k = normalizeArtist(log.artist);
      const e = by.get(k) ?? { name: log.artist, scores: [], people: new Set<string>(), last: 0 };
      e.scores.push(log.score);
      e.people.add(person.id);
      e.last = Math.max(e.last, log.createdAt);
      by.set(k, e);
    }
    return [...by.values()]
      .map((e) => ({ ...e, avg: e.scores.reduce((a, b) => a + b, 0) / e.scores.length }))
      .sort((a, b) => b.people.size - a.people.size || b.avg - a.avg)
      .slice(0, 8);
  }, [cityLogs]);

  const genreArtists = useMemo(() => {
    if (!genre) return [];
    const avg = new Map<string, { t: number; n: number }>();
    for (const c of community ?? []) {
      const k = normalizeArtist(c.artist);
      const e = avg.get(k) ?? { t: 0, n: 0 };
      e.t += c.score;
      e.n++;
      avg.set(k, e);
    }
    return artistsIn(genre)
      .filter((a) => !mineKeys.has(normalizeArtist(a)))
      .sort((a, b) => (avg.get(normalizeArtist(b))?.n ?? 0) - (avg.get(normalizeArtist(a))?.n ?? 0))
      .slice(0, 18);
  }, [genre, community, mineKeys]);

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">Discover</div>
          <h1 className="display page-title">Your next set</h1>
        </div>
      </div>

      <label className="search-field" style={{ marginTop: "1.2rem", marginBottom: "0.4rem" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search artists, venues & festivals"
          aria-label="Search artists, venues and festivals"
        />
        {search && (
          <button type="button" className="search-clear" onClick={() => setSearch("")} aria-label="Clear search">
            ✕
          </button>
        )}
      </label>

      {search.trim() ? (
        <SearchAll query={search} community={community} />
      ) : (
      <>

      <button type="button" className={`city-bar${city ? "" : " empty"}`} onClick={() => setPickingCity(true)}>
        <PinIcon />
        {city === undefined ? (
          <span>Finding your city…</span>
        ) : city ? (
          <>
            <span>
              <small>Your city</small>
              <b>{city}</b>
            </span>
            <span className="city-change">Change</span>
          </>
        ) : (
          <>
            <span>
              <b>Set your city</b>
              <small>See who's playing near you</small>
            </span>
            <span className="city-change">Add</span>
          </>
        )}
      </button>

      <section className="discover-section">
        <div className="section-label">
          For you <span className="muted">{myLogs.length ? "· from what you've rated" : "· starter picks"}</span>
        </div>
        {recs === null ? (
          <Loader size={44} />
        ) : recs.length === 0 ? (
          <p className="hint">Log a few sets and your recommendations show up here.</p>
        ) : (
          <div className="rec-row">
            {recs.map((r) => (
              <RecCard key={r.artist} rec={r} nearDate={nearDates.get(normalizeArtist(r.artist))} />
            ))}
          </div>
        )}
        {myLogs.length > 0 && myLogs.length < 3 && <p className="hint">The more sets you rate, the sharper these get.</p>}
      </section>

      {city && (
        <section className="discover-section">
          <div className="section-label">Playing near {cityName(city)}</div>
          {events === null ? (
            <Loader size={44} />
          ) : !events.configured ? (
            <p className="hint">Live show listings aren't switched on yet.</p>
          ) : shows.length === 0 ? (
            <p className="hint">
              {events.error ? "Couldn't load listings right now — try again later." : `No upcoming electronic shows listed for ${cityName(city)}.`}
            </p>
          ) : (
            <div className="show-list">
              {shows.map((s) => (
                <ShowRow key={s.id} show={s} />
              ))}
            </div>
          )}
        </section>
      )}

      {city && cityArtists.length > 0 && (
        <section className="discover-section">
          <div className="section-label">Seen in {cityName(city)} on Disko</div>
          {cityArtists.map((a) => (
            <Link key={a.name} to={`/artist/${encodeURIComponent(a.name)}`} className="rank-row rank-row-standalone">
              <AvatarThumb name={a.name} />
              <div className="info">
                <div className="who">{a.name}</div>
                <div className="meta">
                  {a.people.size} {a.people.size === 1 ? "person" : "people"} logged them · {a.scores.length} set{a.scores.length === 1 ? "" : "s"}
                </div>
              </div>
              <ScoreRing score={a.avg} bucket={bucketForScore(a.avg)} />
            </Link>
          ))}
        </section>
      )}

      <section className="discover-section">
        <div className="section-label">Explore by sound</div>
        <div className="chip-row genre-chips">
          {GENRES.map((g) => (
            <button key={g} type="button" className={`chip ${genre === g ? "active" : ""}`} onClick={() => setGenre(genre === g ? null : g)}>
              {g}
            </button>
          ))}
        </div>
        {genre && (
          <div className="genre-grid">
            {genreArtists.length === 0 ? (
              <p className="hint">You've logged everyone we know in {genre} — legend.</p>
            ) : (
              genreArtists.map((a) => (
                <Link key={a} to={`/artist/${encodeURIComponent(a)}`} className="genre-tile">
                  <ArtistPhoto name={a} size={64} />
                  <span>{a}</span>
                </Link>
              ))
            )}
          </div>
        )}
      </section>

      </>
      )}

      {pickingCity && <CitySheet current={city ?? ""} onClose={() => setPickingCity(false)} />}
    </div>
  );
}

function RecCard({ rec, nearDate }: { rec: Rec; nearDate?: string }) {
  return (
    <Link to={`/artist/${encodeURIComponent(rec.artist)}`} className={`rec-card ${rec.kind}`}>
      <span className="rec-photo">
        <ArtistPhoto name={rec.artist} size={132} square />
        {nearDate && <span className="rec-near">Near you · {shortDate(nearDate)}</span>}
      </span>
      <span className="rec-name">{rec.artist}</span>
      <span className="rec-reason">{rec.reason}</span>
      {rec.genres[0] && <span className="rec-genre">{rec.genres.slice(0, 2).join(" · ")}</span>}
    </Link>
  );
}

function ShowRow({ show }: { show: ShowListing & { tag: "loved" | "rec" | "seen" | null } }) {
  const d = show.date ? new Date(`${show.date}T00:00:00`) : null;
  return (
    <a href={show.url} target="_blank" rel="noopener noreferrer" className={`show-row${show.tag ? ` ${show.tag}` : ""}`}>
      <span className="show-date">
        <small>{d ? d.toLocaleDateString(undefined, { month: "short" }) : "TBA"}</small>
        <b>{d ? d.getDate() : "—"}</b>
        <small>{d ? d.toLocaleDateString(undefined, { weekday: "short" }) : ""}</small>
      </span>
      <span className="show-info">
        <span className="show-name">{show.name}</span>
        <span className="show-meta">
          {[show.venue, show.time ? formatTime(show.time) : null].filter(Boolean).join(" · ")}
        </span>
        {show.tag && (
          <span className={`show-tag ${show.tag}`}>
            {show.tag === "loved" ? <><Doodle kind="heart" size={19} bare /> You loved them</> : show.tag === "rec" ? "Recommended for you" : "You've seen them"}
          </span>
        )}
      </span>
      <span className="show-go" aria-hidden="true">
        ↗
      </span>
    </a>
  );
}


function shortDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m || 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: m ? "2-digit" : undefined });
}
