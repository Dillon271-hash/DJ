import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useEncoreStore } from "../lib/store";
import { fetchFeed, fetchPeople, SocialSetupError, type FeedItem, type Person } from "../lib/social";
import { formatShortDate, timeAgo } from "../lib/dates";
import { Loader } from "../components/Vinyl";
import { UserAvatar } from "../components/UserAvatar";
import { AvatarThumb } from "../components/AvatarThumb";
import { ScoreRing } from "../components/ScoreRing";

const PEOPLE_PREVIEW = 5;

export function People() {
  const me = useEncoreStore((s) => s.session?.user.id ?? "");
  const [people, setPeople] = useState<Person[] | null>(null);
  const [feed, setFeed] = useState<FeedItem[] | null>(null);
  const [error, setError] = useState<"setup" | "other" | null>(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let stale = false;
    Promise.all([fetchPeople(me), fetchFeed(me)])
      .then(([p, f]) => {
        if (stale) return;
        setPeople(p);
        setFeed(f);
      })
      .catch((e) => {
        if (stale) return;
        console.error("[people] load failed:", e);
        setError(e instanceof SocialSetupError ? "setup" : "other");
      });
    return () => {
      stale = true;
    };
  }, [me]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !people) return null;
    return people.filter((p) => p.name.toLowerCase().includes(q));
  }, [people, query]);

  async function invite() {
    const url = window.location.origin;
    const text = "Rank every DJ set you've seen with me on Encore";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Encore", text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Share sheet dismissed — nothing to do.
    }
  }

  if (error) {
    return (
      <div className="empty-state">
        <h2 className="display" style={{ fontSize: "1.4rem", margin: "0 0 0.6rem" }}>
          {error === "setup" ? "One setup step left" : "Couldn't load people"}
        </h2>
        <p style={{ margin: 0 }}>
          {error === "setup"
            ? "Re-run supabase/schema.sql in your Supabase SQL Editor to turn on People."
            : "Check your connection and try again."}
        </p>
      </div>
    );
  }

  if (!people || !feed) return <Loader label="Finding the crowd" />;

  const shownPeople = matches ?? (showAll ? people : people.slice(0, PEOPLE_PREVIEW));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
        <div>
          <div className="eyebrow">People</div>
          <h1 className="display" style={{ fontSize: "1.9rem", margin: "0.3rem 0 0" }}>
            The crowd
          </h1>
        </div>
        <button type="button" className="ghost-btn invite-btn" onClick={invite}>
          {copied ? "Link copied" : "Invite"}
        </button>
      </div>

      {people.length > 0 && (
        <label className="search-field" style={{ marginTop: "1.4rem" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find someone on Encore"
            aria-label="Find someone on Encore"
          />
        </label>
      )}

      {people.length === 0 ? (
        <div className="people-empty">
          <p>No one else is on Encore yet.</p>
          <button type="button" className="sticker-btn" onClick={invite}>
            {copied ? "Link copied" : "Invite your friends"}
          </button>
        </div>
      ) : (
        <section>
          {!matches && <div className="section-label">On Encore</div>}
          {shownPeople.length === 0 ? (
            <p style={{ color: "var(--smoke)" }}>No one called “{query.trim()}” yet.</p>
          ) : (
            shownPeople.map((p) => (
              <Link key={p.id} to={`/u/${p.id}`} className="rank-row rank-row-standalone person-row">
                <UserAvatar id={p.id} name={p.name} />
                <div className="info">
                  <div className="who">{p.name}</div>
                  <div className="meta">
                    {p.setCount === 0
                      ? "No sets yet"
                      : `${p.setCount} set${p.setCount === 1 ? "" : "s"}${p.topArtist ? ` · Top: ${p.topArtist}` : ""}`}
                  </div>
                </div>
                <span className="chevron" aria-hidden="true">
                  ›
                </span>
              </Link>
            ))
          )}
          {!matches && people.length > PEOPLE_PREVIEW && (
            <button type="button" className="link-btn" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show fewer" : `See everyone (${people.length})`}
            </button>
          )}
        </section>
      )}

      {!matches && feed.length > 0 && (
        <section style={{ marginTop: "2rem" }}>
          <div className="section-label">Latest sets</div>
          {feed.map(({ log, person }) => (
            <article key={log.id} className="feed-item">
              <Link to={`/u/${person.id}`} className="feed-who">
                <UserAvatar id={person.id} name={person.name} size={28} />
                <span>
                  <b>{person.name}</b> ranked a set
                </span>
                <span className="feed-time">{timeAgo(log.createdAt)}</span>
              </Link>
              <Link to={`/set/${log.id}`} className="feed-set">
                <AvatarThumb name={log.artist} />
                <div className="info">
                  <div className="who">{log.artist}</div>
                  <div className="meta">
                    {log.event} · {formatShortDate(log.date)}
                  </div>
                </div>
                <ScoreRing score={log.score} bucket={log.bucket} />
              </Link>
              {log.note && <p className="feed-note">“{log.note}”</p>}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
