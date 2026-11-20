import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useFriendMap } from "../lib/community";
import { useEncoreStore } from "../lib/store";
import { splitVenue } from "../lib/venueNames";
import { formatLongDate, formatShortDate } from "../lib/dates";
import { bucketForScore } from "../lib/ranking";
import type { FeedItem } from "../lib/social";
import { ScoreRing } from "./ScoreRing";
import { UserAvatar } from "./UserAvatar";
import { MediaStrip } from "./MediaStrip";

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const venueKey = (event: string) => splitVenue(event).name.trim().toLowerCase();

// One artist at one venue, shown inline on the artist or venue page: a
// score for their sets there, then every night with each rating (and its
// date).
export function ComboPanel({
  artist,
  venue,
  items,
  onClear,
}: {
  artist: string;
  /** The venue's "Name, City". */
  venue: string;
  /** Everyone's sets for the page's artist or venue — filtered here. */
  items: FeedItem[];
  onClear: () => void;
}) {
  const me = useEncoreStore((s) => s.session?.user.id ?? "");
  const friends = useFriendMap();
  const ref = useRef<HTMLElement>(null);
  const { name: venueName, place } = splitVenue(venue);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [artist, venue]);

  const sets = useMemo(
    () =>
      items.filter(
        (i) => i.log.artist.trim().toLowerCase() === artist.trim().toLowerCase() && venueKey(i.log.event) === venueKey(venue),
      ),
    [items, artist, venue],
  );

  const nights = useMemo(() => {
    const by = new Map<string, FeedItem[]>();
    for (const i of sets) by.set(i.log.date, [...(by.get(i.log.date) ?? []), i]);
    return [...by]
      .map(([date, list]) => ({
        date,
        list: list.sort((x, y) => y.log.score - x.log.score),
        score: avg(list.map((i) => i.log.score)),
        media: list.flatMap((i) => i.log.mediaPaths ?? []),
      }))
      .sort((x, y) => y.date.localeCompare(x.date));
  }, [sets]);

  const venueScores = sets.map((i) => i.log.venueScore).filter((s): s is number => typeof s === "number");
  const mine = sets.filter((i) => i.person.id === me);
  const theirs = sets.filter((i) => friends.has(i.person.id));
  const score = sets.length ? avg(sets.map((i) => i.log.score)) : null;
  const second =
    mine.length > 0
      ? { label: "You", score: avg(mine.map((i) => i.log.score)), sub: "Your score" }
      : theirs.length > 0
        ? { label: "Friends", score: avg(theirs.map((i) => i.log.score)), sub: `${new Set(theirs.map((i) => i.person.id)).size} friend(s)` }
        : { label: "Friends", score: null, sub: "No friends' ratings" };

  return (
    <section className="combo-panel" ref={ref}>
      <div className="combo-panel-head">
        <div className="combo-title">
          <span className="display">{artist}</span>
          <span className="combo-at">at</span>
          <span className="combo-venue">{venueName}</span>
          {place && <small>{place}</small>}
        </div>
        <button type="button" className="icon-btn" onClick={onClear} aria-label="Close">
          ✕
        </button>
      </div>

      <div className="score-trio">
        <div className={`trio-tile highlight${score !== null ? ` ${bucketForScore(score)}` : ""}`}>
          <span className="trio-label">Their sets here</span>
          <b className="trio-score">{score === null ? "—" : score.toFixed(1)}</b>
          <span className="trio-sub">
            {sets.length} rating{sets.length === 1 ? "" : "s"} · {nights.length} night{nights.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="trio-tile">
          <span className="trio-label">{second.label}</span>
          <b className="trio-score">{second.score === null ? "—" : second.score.toFixed(1)}</b>
          <span className="trio-sub">{second.sub}</span>
        </div>
        <div className="trio-tile">
          <span className="trio-label">The venue</span>
          <b className="trio-score">{venueScores.length ? avg(venueScores).toFixed(1) : "—"}</b>
          <span className="trio-sub">on those nights</span>
        </div>
      </div>

      {nights.length === 0 ? (
        <p className="hint">
          No one's rated {artist} at {venueName} yet.{" "}
          <Link to={`/log/${encodeURIComponent(artist)}`}>Log it</Link>
        </p>
      ) : (
        nights.map((n) => (
          <div key={n.date} className="night-card">
            <div className="night-head">
              <div>
                <div className="night-date">{formatLongDate(n.date)}</div>
                <div className="night-meta">
                  {n.list.length} rating{n.list.length === 1 ? "" : "s"} that night
                </div>
              </div>
              <ScoreRing score={n.score} bucket={bucketForScore(n.score)} />
            </div>
            {n.list.map(({ log, person }) => (
              <Link key={log.id} to={`/set/${log.id}`} className="night-rating">
                <UserAvatar id={person.id} name={person.name} size={30} />
                <span className="night-person">
                  <span className="night-who">{person.id === me ? "You" : `@${person.name}`}</span>
                  <small>{formatShortDate(log.date)}</small>
                </span>
                {log.note && <span className="night-note">“{log.note}”</span>}
                <b>{log.score.toFixed(1)}</b>
              </Link>
            ))}
            {n.media.length > 0 && <MediaStrip paths={n.media} />}
          </div>
        ))
      )}
    </section>
  );
}
