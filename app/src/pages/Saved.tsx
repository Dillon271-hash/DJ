import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchSavedSets, useSaved } from "../lib/saved";
import { useEngagement } from "../lib/engagement";
import { splitVenue } from "../lib/venueNames";
import type { FeedItem } from "../lib/social";
import { Loader } from "../components/Vinyl";
import { ArtistPhoto } from "../components/ArtistPhoto";
import { FeedCard } from "../components/FeedCard";
import { Doodle } from "../components/Doodle";

// Want to see: everything you've saved from other people's posts, rolled
// up into the artists you want to see and the venues you want to go to.
export function Saved() {
  const navigate = useNavigate();
  const ids = useSaved((s) => s.ids);
  const available = useSaved((s) => s.available);
  const loadEngagement = useEngagement((s) => s.load);
  const [items, setItems] = useState<(FeedItem & { savedAt: number })[] | null>(null);
  const [view, setView] = useState<"artists" | "venues" | "posts">("artists");

  useEffect(() => {
    let stale = false;
    fetchSavedSets().then((r) => {
      if (stale) return;
      setItems(r);
      loadEngagement(r.map((i) => i.log.id));
    });
    return () => {
      stale = true;
    };
  }, [loadEngagement]);

  // Unsaving from a card here removes it right away.
  const visible = useMemo(() => (items ?? []).filter((i) => !ids || ids.has(i.log.id)), [items, ids]);

  const artists = useMemo(() => {
    const m = new Map<string, { name: string; n: number; best: number; who: Set<string> }>();
    for (const { log, person } of visible) {
      const k = log.artist.trim().toLowerCase();
      const e = m.get(k) ?? { name: log.artist, n: 0, best: 0, who: new Set<string>() };
      e.n++;
      e.best = Math.max(e.best, log.score);
      e.who.add(person.name);
      m.set(k, e);
    }
    return [...m.values()].sort((a, b) => b.n - a.n || b.best - a.best);
  }, [visible]);

  const venues = useMemo(() => {
    const m = new Map<string, { event: string; name: string; place: string; n: number; best: number }>();
    for (const { log } of visible) {
      const v = splitVenue(log.event);
      const k = v.name.trim().toLowerCase();
      const e = m.get(k) ?? { event: log.event, name: v.name, place: v.place, n: 0, best: 0 };
      e.n++;
      e.best = Math.max(e.best, log.venueScore ?? 0);
      m.set(k, e);
    }
    return [...m.values()].sort((a, b) => b.n - a.n || b.best - a.best);
  }, [visible]);

  if (!available) {
    return (
      <div className="empty-state">
        <p>Re-run supabase/schema.sql in Supabase to turn on Want to see.</p>
      </div>
    );
  }
  if (items === null) return <Loader label="Loading your list" />;

  return (
    <div>
      <button className="artist-back" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <div className="page-head">
        <div>
          <div className="eyebrow">Saved</div>
          <h1 className="display page-title">Want to see</h1>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="people-empty">
          <p>Tap the bookmark on anyone's post to save the artist and venue here.</p>
          <Link to="/" className="sticker-btn">
            Browse the feed
          </Link>
        </div>
      ) : (
        <>
          <div className="seg seg-wide" style={{ margin: "1.2rem 0 1rem" }}>
            <button type="button" className={view === "artists" ? "on" : ""} onClick={() => setView("artists")}>
              Artists <span className="seg-count">{artists.length}</span>
            </button>
            <button type="button" className={view === "venues" ? "on" : ""} onClick={() => setView("venues")}>
              Venues <span className="seg-count">{venues.length}</span>
            </button>
            <button type="button" className={view === "posts" ? "on" : ""} onClick={() => setView("posts")}>
              Posts <span className="seg-count">{visible.length}</span>
            </button>
          </div>

          {view === "artists" && (
            <div className="want-grid">
              {artists.map((a) => (
                <Link key={a.name} to={`/artist/${encodeURIComponent(a.name)}`} className="want-tile">
                  <ArtistPhoto name={a.name} size={120} square />
                  <b>{a.name}</b>
                  <small>
                    {a.n > 1 ? `${a.n} saves` : `via @${[...a.who][0]}`} · up to {a.best.toFixed(1)}
                  </small>
                </Link>
              ))}
            </div>
          )}

          {view === "venues" &&
            venues.map((v) => (
              <Link key={v.name} to={`/venue/${encodeURIComponent(v.event)}`} className="rank-row rank-row-standalone">
                <Doodle kind="venue" />
                <div className="info">
                  <div className="who">{v.name}</div>
                  <div className="meta">
                    {[v.place, `${v.n} saved set${v.n === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <span className="chevron" aria-hidden="true">
                  ›
                </span>
              </Link>
            ))}

          {view === "posts" && visible.map((item) => <FeedCard key={item.log.id} item={item} />)}
        </>
      )}
    </div>
  );
}
