import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useEncoreStore } from "../lib/store";
import { fetchFeed, useSocial, type FeedItem } from "../lib/social";
import { cityName, fetchCityLogs, isInCity, useCity } from "../lib/discover";
import { useEngagement } from "../lib/engagement";
import { Loader } from "../components/Vinyl";
import { FeedCard } from "../components/FeedCard";
import { TagInvites } from "../components/TagInvites";
import { CitySheet, PinIcon } from "../components/CitySheet";
import { UserAvatar } from "../components/UserAvatar";

type FeedTab = "plus-ones" | "everyone";

// Home: what your plus-ones (or everyone) have been seeing, sets near
// your city first, with likes, comments and sharing on every post.
export function Feed() {
  const me = useEncoreStore((s) => s.session?.user.id ?? "");
  const plusOnes = useSocial((s) => s.plusOnes);
  const setupNeeded = useSocial((s) => s.setupNeeded);
  const loadEngagement = useEngagement((s) => s.load);
  const { city, load: loadCity } = useCity();
  const [tab, setTab] = useState<FeedTab | null>(null);
  const [feed, setFeed] = useState<(FeedItem & { near?: boolean })[] | null>(null);
  const [pickingCity, setPickingCity] = useState(false);

  useEffect(() => {
    if (city === undefined) loadCity();
  }, [city, loadCity]);

  const friendIds = useMemo(() => plusOnes?.friends.map((f) => f.id) ?? null, [plusOnes]);
  // Your plus-ones' sets once you have some; everyone's until then.
  const activeTab: FeedTab = tab ?? (friendIds && friendIds.length > 0 ? "plus-ones" : "everyone");
  const friendKey = friendIds?.join(",");

  useEffect(() => {
    if (friendIds === null || city === undefined) return;
    let stale = false;
    setFeed(null);
    const scope = activeTab === "plus-ones" ? new Set(friendIds) : null;
    Promise.all([
      fetchFeed(me, scope ? { userIds: friendIds, limit: 40 } : { limit: 40 }),
      city ? fetchCityLogs(city, 80).catch(() => []) : Promise.resolve([]),
    ])
      .then(([latest, local]) => {
        if (stale) return;
        // Sets near your city from the last 45 days first (newest first),
        // then everything else in time order.
        const cutoff = Date.now() - 45 * 86_400_000;
        const near = local.filter(
          (i) => i.person.id !== me && (!scope || scope.has(i.person.id)) && i.log.createdAt >= cutoff,
        );
        const nearIds = new Set(near.map((i) => i.log.id));
        const rest = latest
          .filter((i) => !nearIds.has(i.log.id))
          .map((i) => ({ ...i, near: city ? isInCity(i.log.event, city) : false }));
        const items = [...near.map((i) => ({ ...i, near: true })), ...rest];
        loadEngagement(items.map((i) => i.log.id));
        setFeed(items);
      })
      .catch(() => !stale && setFeed([]));
    return () => {
      stale = true;
    };
    // friendKey stands in for friendIds' contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, activeTab, friendKey, city]);

  const requests = plusOnes?.incoming ?? [];

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">Feed</div>
          <h1 className="display page-title">The floor</h1>
        </div>
        <div className="feed-head-actions">
        <Link to="/saved" className="ghost-btn people-btn" aria-label="Want to see">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 3.5h12v17l-6-4.2-6 4.2z" />
          </svg>
          Saved
        </Link>
        <Link to="/people" className="ghost-btn people-btn" aria-label="Find people">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="9" cy="8" r="3.5" />
            <path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M19 8v6M16 11h6" />
          </svg>
          People
          {requests.length > 0 && <span className="count-dot">{requests.length}</span>}
        </Link>
        </div>
      </div>

      {requests.length > 0 && (
        <Link to="/people" className="request-banner">
          <span className="avatar-stack">
            {requests.slice(0, 3).map((p) => (
              <UserAvatar key={p.id} id={p.id} name={p.name} size={26} />
            ))}
          </span>
          <span>
            <b>{requests.length === 1 ? `@${requests[0].name}` : `${requests.length} people`}</b> want
            {requests.length === 1 ? "s" : ""} to be your plus-one
          </span>
          <span className="chevron" aria-hidden="true">
            ›
          </span>
        </Link>
      )}

      <TagInvites />

      {setupNeeded ? (
        <p className="hint" style={{ marginTop: "1.4rem" }}>
          Re-run supabase/schema.sql in your Supabase SQL Editor to turn on the feed.
        </p>
      ) : (
        <section style={{ marginTop: "1.2rem" }}>
          <div className="feed-head">
            <div className="seg">
              <button type="button" className={activeTab === "plus-ones" ? "on" : ""} onClick={() => setTab("plus-ones")}>
                Plus-ones
              </button>
              <button type="button" className={activeTab === "everyone" ? "on" : ""} onClick={() => setTab("everyone")}>
                Everyone
              </button>
            </div>
            <button type="button" className="feed-city" style={{ margin: "0 0 0 auto" }} onClick={() => setPickingCity(true)}>
              <PinIcon />
              {city ? cityName(city) : "Set city"}
            </button>
          </div>
          {feed === null ? (
            <Loader size={52} />
          ) : feed.length === 0 ? (
            <div className="people-empty">
              <p>
                {activeTab === "plus-ones"
                  ? plusOnes?.friends.length
                    ? "Your plus-ones haven't logged any sets yet."
                    : "Add plus-ones and their sets show up here."
                  : "No one else has logged a set yet."}
              </p>
              {activeTab === "plus-ones" && !plusOnes?.friends.length ? (
                <Link to="/people" className="sticker-btn">
                  Find people
                </Link>
              ) : (
                <Link to="/log" className="sticker-btn">
                  Log a set
                </Link>
              )}
            </div>
          ) : (
            feed.map((item) => <FeedCard key={item.log.id} item={item} near={item.near} />)
          )}
        </section>
      )}

      {pickingCity && <CitySheet current={city ?? ""} onClose={() => setPickingCity(false)} />}
    </div>
  );
}
