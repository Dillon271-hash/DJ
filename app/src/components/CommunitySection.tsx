import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { FeedItem } from "../lib/social";
import { isVideoPath, mediaUrl } from "../lib/media";
import { formatShortDate } from "../lib/dates";
import { bucketForScore } from "../lib/ranking";
import { splitVenue } from "../lib/venueNames";
import { useEncoreStore } from "../lib/store";
import { Lightbox } from "./MediaStrip";
import { UserAvatar } from "./UserAvatar";
import { AvatarThumb } from "./AvatarThumb";
import { ScoreRing } from "./ScoreRing";

const PREVIEW = 6;

// Everyone's photos/videos and rankings for one artist or venue.
export function CommunitySection({ items, kind }: { items: FeedItem[]; kind: "artist" | "venue" }) {
  const me = useEncoreStore((s) => s.session?.user.id ?? "");
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  const media = useMemo(() => items.flatMap((i) => i.log.mediaPaths ?? []).slice(0, 30), [items]);
  const ranked = useMemo(() => {
    const score = (i: FeedItem) => (kind === "artist" ? i.log.score : (i.log.venueScore ?? -1));
    return items.filter((i) => score(i) >= 0).sort((a, b) => score(b) - score(a));
  }, [items, kind]);
  const shown = showAll ? ranked : ranked.slice(0, PREVIEW);

  return (
    <>
      {media.length > 0 && (
        <section style={{ marginTop: "1.8rem" }}>
          <div className="section-label">
            Photos &amp; videos <span className="muted">{media.length}</span>
          </div>
          <div className="media-grid">
            {media.slice(0, 9).map((p, i) => (
              <button key={p} type="button" className="media-tile" onClick={() => setOpen(i)} aria-label={`Open ${isVideoPath(p) ? "video" : "photo"} ${i + 1}`}>
                {isVideoPath(p) ? (
                  <>
                    <video src={`${mediaUrl(p)}#t=0.1`} muted playsInline preload="metadata" />
                    <span className="media-play" aria-hidden="true">▶</span>
                  </>
                ) : (
                  <img src={mediaUrl(p)} alt="" loading="lazy" decoding="async" />
                )}
                {i === 8 && media.length > 9 && <span className="media-more">+{media.length - 9}</span>}
              </button>
            ))}
          </div>
          {open !== null && <Lightbox paths={media} start={open} onClose={() => setOpen(null)} />}
        </section>
      )}

      {ranked.length > 0 && (
        <section style={{ marginTop: "1.8rem" }}>
          <div className="section-label">
            Everyone's rankings <span className="muted">{ranked.length}</span>
          </div>
          {shown.map(({ log, person }, i) => {
            const score = kind === "artist" ? log.score : log.venueScore!;
            return (
              <Link key={log.id} to={`/set/${log.id}`} className="rank-row rank-row-standalone community-row">
                <span className="num">{i + 1}</span>
                {kind === "artist" ? <UserAvatar id={person.id} name={person.name} size={40} /> : <AvatarThumb name={log.artist} />}
                <div className="info">
                  <div className="who">
                    {kind === "artist" ? (person.id === me ? "You" : `@${person.name}`) : log.artist}
                  </div>
                  <div className="meta">
                    {kind === "artist"
                      ? `${splitVenue(log.event).name} · ${formatShortDate(log.date)}`
                      : `${person.id === me ? "You" : `@${person.name}`} · ${formatShortDate(log.date)}`}
                  </div>
                </div>
                <ScoreRing score={score} bucket={bucketForScore(score)} />
              </Link>
            );
          })}
          {ranked.length > PREVIEW && (
            <button type="button" className="link-btn" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show fewer" : `See all ${ranked.length}`}
            </button>
          )}
        </section>
      )}
    </>
  );
}
