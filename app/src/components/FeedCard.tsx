import { Link, useNavigate } from "react-router-dom";
import { logFromTagPath, useOpenInvites } from "../lib/tags";
import type { FeedItem } from "../lib/social";
import { formatShortDate, timeAgo } from "../lib/dates";
import { UserAvatar } from "./UserAvatar";
import { AvatarThumb } from "./AvatarThumb";
import { ScoreRing } from "./ScoreRing";
import { MediaStrip } from "./MediaStrip";
import { BUCKET_LABEL } from "../lib/types";
import { PostActions } from "./PostActions";
import { Doodle } from "./Doodle";

// One set in a feed: who, what they rated, their note and photos inline.
export function FeedCard({ item: { log, person }, near = false }: { item: FeedItem; near?: boolean }) {
  const navigate = useNavigate();
  const open = useOpenInvites();
  const match = open.find((i) => i.logId === log.id);
  const invite = match ? logFromTagPath(match) : null;
  return (
    <article className={`feed-item ${log.bucket}`}>
      <Link to={`/u/${person.id}`} className="feed-who">
        <UserAvatar id={person.id} name={person.name} size={28} />
        <span>
          <b>{person.name}</b> {log.bucket === "loved" ? "loved" : log.bucket === "good" ? "rated" : "wasn't into"}
        </span>
        {near && <span className="near-tag"><Doodle kind="pin" size={14} bare /> Near you</span>}
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
      {log.mediaPaths && log.mediaPaths.length > 0 && <MediaStrip paths={log.mediaPaths} />}
      {log.withWho && <p className="feed-with">With {log.withWho}</p>}
      {invite && (
        <div className="feed-tagged">
          <span>You're tagged in this one</span>
          <button type="button" className="plus-btn compact" onClick={() => navigate(invite.to, { state: invite.state })}>
            Rank it too
          </button>
        </div>
      )}
      <PostActions log={log} ownerName={person.name} />
      <span className="sr-only">{BUCKET_LABEL[log.bucket]}</span>
    </article>
  );
}
