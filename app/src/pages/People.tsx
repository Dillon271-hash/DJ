import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useEncoreStore } from "../lib/store";
import { fetchFeed, fetchPeople, SocialSetupError, useSocial, type FeedItem, type Person } from "../lib/social";
import { Loader } from "../components/Vinyl";
import { UserAvatar } from "../components/UserAvatar";
import { PlusOneButton } from "../components/PlusOneButton";
import { FeedCard } from "../components/FeedCard";

const PEOPLE_PREVIEW = 5;
type FeedTab = "plus-ones" | "everyone";

export function People() {
  const me = useEncoreStore((s) => s.session?.user.id ?? "");
  const plusOnes = useSocial((s) => s.plusOnes);
  const setupNeeded = useSocial((s) => s.setupNeeded);
  const removePlusOne = useSocial((s) => s.removePlusOne);
  const acceptPlusOne = useSocial((s) => s.acceptPlusOne);

  const [people, setPeople] = useState<Person[] | null>(null);
  const [error, setError] = useState<"setup" | "other" | null>(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<FeedTab | null>(null);
  const [feed, setFeed] = useState<FeedItem[] | null>(null);

  const friendIds = useMemo(() => plusOnes?.friends.map((f) => f.id) ?? null, [plusOnes]);
  // Default to your plus-ones' sets once you have some.
  const activeTab: FeedTab = tab ?? (friendIds && friendIds.length > 0 ? "plus-ones" : "everyone");

  useEffect(() => {
    let stale = false;
    fetchPeople(me)
      .then((p) => !stale && setPeople(p))
      .catch((e) => {
        if (stale) return;
        console.error("[people] load failed:", e);
        setError(e instanceof SocialSetupError ? "setup" : "other");
      });
    return () => {
      stale = true;
    };
  }, [me]);

  const friendKey = friendIds?.join(",");
  useEffect(() => {
    if (friendIds === null) return;
    let stale = false;
    setFeed(null);
    fetchFeed(me, activeTab === "plus-ones" ? { userIds: friendIds } : {})
      .then((f) => !stale && setFeed(f))
      .catch(() => !stale && setFeed([]));
    return () => {
      stale = true;
    };
    // friendKey stands in for friendIds' contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, activeTab, friendKey]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !people) return null;
    return people.filter((p) => p.name.toLowerCase().includes(q));
  }, [people, query]);

  // Suggestions: people you're not already plus-ones with.
  const suggestions = useMemo(
    () => (people ?? []).filter((p) => !friendIds?.includes(p.id)),
    [people, friendIds],
  );

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
      // Share sheet dismissed.
    }
  }

  if (error || setupNeeded) {
    return (
      <div className="empty-state">
        <h2 className="display" style={{ fontSize: "1.4rem", margin: "0 0 0.6rem" }}>
          {error === "other" ? "Couldn't load people" : "One setup step left"}
        </h2>
        <p style={{ margin: 0 }}>
          {error === "other"
            ? "Check your connection and try again."
            : "Re-run supabase/schema.sql in your Supabase SQL Editor to turn on People, plus-ones and crews."}
        </p>
      </div>
    );
  }

  if (!people || !plusOnes) return <Loader label="Finding the crowd" />;

  const shownPeople = matches ?? (showAll ? suggestions : suggestions.slice(0, PEOPLE_PREVIEW));

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">People</div>
          <h1 className="display page-title">The crowd</h1>
        </div>
        <button type="button" className="ghost-btn invite-btn" onClick={invite}>
          {copied ? "Link copied" : "Invite"}
        </button>
      </div>

      {plusOnes.incoming.length > 0 && (
        <section className="request-block">
          <div className="section-label">
            Plus-one requests <span className="count-dot">{plusOnes.incoming.length}</span>
          </div>
          {plusOnes.incoming.map((p) => (
            <div key={p.id} className="request-row">
              <Link to={`/u/${p.id}`} className="request-who">
                <UserAvatar id={p.id} name={p.name} size={40} />
                <span>
                  <b>{p.name}</b>
                  <small>wants to be your plus-one</small>
                </span>
              </Link>
              <button type="button" className="plus-btn accept compact" onClick={() => acceptPlusOne(p)}>
                Accept
              </button>
              <button type="button" className="icon-btn" aria-label={`Decline ${p.name}`} onClick={() => removePlusOne(p.id)}>
                ✕
              </button>
            </div>
          ))}
        </section>
      )}

      <section>
        <div className="section-label">
          Your plus-ones <span className="muted">{plusOnes.friends.length}</span>
        </div>
        {plusOnes.friends.length === 0 ? (
          <p className="hint">Add people below — their sets fill your feed, and you can pull them into a crew.</p>
        ) : (
          <div className="plus-row">
            {plusOnes.friends.map((f) => (
              <Link key={f.id} to={`/u/${f.id}`} className="plus-chip">
                <UserAvatar id={f.id} name={f.name} size={52} />
                <span>{f.name.split(/\s+/)[0]}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {people.length > 0 && (
        <label className="search-field" style={{ marginTop: "1.2rem" }}>
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
        (matches || suggestions.length > 0) && (
          <section>
            {!matches && <div className="section-label">People to add</div>}
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
                  <PlusOneButton person={p} compact />
                </Link>
              ))
            )}
            {!matches && suggestions.length > PEOPLE_PREVIEW && (
              <button type="button" className="link-btn" onClick={() => setShowAll((v) => !v)}>
                {showAll ? "Show fewer" : `See everyone (${suggestions.length})`}
              </button>
            )}
          </section>
        )
      )}

      {!matches && (
        <section style={{ marginTop: "2rem" }}>
          <div className="feed-head">
            <div className="section-label" style={{ margin: 0 }}>
              Latest sets
            </div>
            <div className="seg">
              <button type="button" className={activeTab === "plus-ones" ? "on" : ""} onClick={() => setTab("plus-ones")}>
                Plus-ones
              </button>
              <button type="button" className={activeTab === "everyone" ? "on" : ""} onClick={() => setTab("everyone")}>
                Everyone
              </button>
            </div>
          </div>
          {feed === null ? (
            <Loader size={44} />
          ) : feed.length === 0 ? (
            <p className="hint" style={{ marginTop: "1rem" }}>
              {activeTab === "plus-ones"
                ? plusOnes.friends.length === 0
                  ? "No plus-ones yet — add some people above."
                  : "Your plus-ones haven't logged any sets yet."
                : "No one else has logged a set yet."}
            </p>
          ) : (
            feed.map((item) => <FeedCard key={item.log.id} item={item} />)
          )}
        </section>
      )}
    </div>
  );
}
