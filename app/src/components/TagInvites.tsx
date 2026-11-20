import { Link, useNavigate } from "react-router-dom";
import { logFromTagPath, useOpenInvites, useTagInvites } from "../lib/tags";
import { splitVenue } from "../lib/venueNames";
import { formatShortDate } from "../lib/dates";
import { UserAvatar } from "./UserAvatar";
import { AvatarThumb } from "./AvatarThumb";

// "You were tagged" — sets your friends logged with you in them. One tap
// to rank it yourself (everything but your rating is already filled in).
export function TagInvites() {
  const invites = useOpenInvites();
  const dismiss = useTagInvites((s) => s.dismiss);
  const navigate = useNavigate();
  if (invites.length === 0) return null;

  return (
    <section className="tag-invites">
      <div className="section-label">
        You were tagged <span className="count-dot">{invites.length}</span>
      </div>
      {invites.slice(0, 5).map((i) => {
        const { to, state } = logFromTagPath(i);
        return (
          <div key={i.logId} className="tag-invite">
            <AvatarThumb name={i.artist} />
            <div className="tag-invite-info">
              <div className="tag-invite-artist">{i.artist}</div>
              <div className="tag-invite-meta">
                {splitVenue(i.event).name} · {formatShortDate(i.date)}
              </div>
              <Link to={`/u/${i.by.id}`} className="tag-invite-by">
                <UserAvatar id={i.by.id} name={i.by.name} size={16} />@{i.by.name} tagged you
              </Link>
            </div>
            <button type="button" className="plus-btn compact" onClick={() => navigate(to, { state })}>
              Rank it
            </button>
            <button type="button" className="icon-btn" aria-label={`Dismiss ${i.artist}`} onClick={() => dismiss(i.logId)}>
              ✕
            </button>
          </div>
        );
      })}
    </section>
  );
}
