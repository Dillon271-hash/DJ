import { useMemo, useState } from "react";
import type { FeedItem } from "../lib/social";
import { splitVenue } from "../lib/venueNames";
import { bucketForScore } from "../lib/ranking";
import { formatShortDate } from "../lib/dates";
import { Sheet } from "./Sheet";
import { ScoreRing } from "./ScoreRing";
import { AvatarThumb } from "./AvatarThumb";

interface Group {
  key: string;
  label: string;
  sub: string;
  /** Full venue string (for links) or artist name. */
  value: string;
  scores: number[];
  last: string;
}

// The "menu" on an artist page (search the venues they've played) or a
// venue page (search the DJs who've played there). Picking one shows that
// pairing's ratings right on the page.
export function BreakdownSheet({
  kind,
  subject,
  items,
  onPick,
  onClose,
}: {
  /** "artist": we're on an artist page, so list venues. "venue": list DJs. */
  kind: "artist" | "venue";
  subject: string;
  items: FeedItem[];
  /** The venue's full "Name, City" (artist page) or the DJ's name (venue page). */
  onPick: (value: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const groups = useMemo<Group[]>(() => {
    const by = new Map<string, Group>();
    for (const { log } of items) {
      const v = splitVenue(log.event);
      const key = kind === "artist" ? v.name.trim().toLowerCase() : log.artist.trim().toLowerCase();
      const g =
        by.get(key) ??
        ({
          key,
          label: kind === "artist" ? v.name : log.artist,
          sub: kind === "artist" ? v.place : "",
          value: kind === "artist" ? log.event : log.artist,
          scores: [],
          last: log.date,
        } as Group);
      // A set's own score is the DJ's rating; on the venue side we still
      // rank DJs by their set scores there.
      g.scores.push(log.score);
      if (log.date > g.last) g.last = log.date;
      by.set(key, g);
    }
    return [...by.values()].sort((a, b) => b.scores.length - a.scores.length || avg(b.scores) - avg(a.scores));
  }, [items, kind]);

  const q = query.trim().toLowerCase();
  const shown = q ? groups.filter((g) => g.label.toLowerCase().includes(q) || g.sub.toLowerCase().includes(q)) : groups;
  const title = kind === "artist" ? `${subject} at…` : `DJs at ${splitVenue(subject).name}`;

  return (
    <Sheet onClose={onClose} label={title}>
      <h2 className="display sheet-title">{title}</h2>
      <p className="hint" style={{ textAlign: "center", margin: "-0.5rem 0 0.9rem" }}>
        {kind === "artist" ? "Pick a venue to see how their nights there were rated." : "Pick a DJ to see how their nights here were rated."}
      </p>
      <input
        className="text-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={kind === "artist" ? "Search venues & festivals" : "Search DJs"}
        aria-label={kind === "artist" ? "Search venues" : "Search DJs"}
        autoFocus
      />
      <div className="breakdown-list">
        {groups.length === 0 ? (
          <p className="hint">No ratings yet.</p>
        ) : shown.length === 0 ? (
          <p className="hint">
            No ratings for {kind === "artist" ? `${subject} at “${query.trim()}”` : `“${query.trim()}” here`} yet.
          </p>
        ) : (
          shown.map((g) => {
            const score = avg(g.scores);
            return (
              <button
                key={g.key}
                type="button"
                className="rank-row rank-row-standalone breakdown-row"
                onClick={() => {
                  onPick(g.value);
                  onClose();
                }}
              >
                {kind === "venue" ? (
                  <AvatarThumb name={g.label} />
                ) : (
                  <span className="venue-search-icon" aria-hidden="true">
                    🏛
                  </span>
                )}
                <div className="info">
                  <div className="who">{g.label}</div>
                  <div className="meta">
                    {[g.sub, `${g.scores.length} rating${g.scores.length === 1 ? "" : "s"}`, `last ${formatShortDate(g.last)}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <ScoreRing score={score} bucket={bucketForScore(score)} />
              </button>
            );
          })
        )}
      </div>
    </Sheet>
  );
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
