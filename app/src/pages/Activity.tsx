import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useActivity, type ActivityItem } from "../lib/activity";
import { timeAgo } from "../lib/dates";
import { Loader } from "../components/Vinyl";
import { UserAvatar } from "../components/UserAvatar";

const VERB: Record<ActivityItem["kind"], string> = {
  like: "liked your",
  comment: "commented on your",
  save: "saved your",
  tag: "tagged you in their",
};

const ICON: Record<ActivityItem["kind"], string> = { like: "♥", comment: "💬", save: "🔖", tag: "🏷" };

// Notifications.
export function Activity() {
  const navigate = useNavigate();
  const items = useActivity((s) => s.items);
  const seenAt = useActivity((s) => s.seenAt);
  const load = useActivity((s) => s.load);
  const markSeen = useActivity((s) => s.markSeen);

  useEffect(() => {
    load();
  }, [load]);

  // Opening the page counts as seeing everything — but keep this visit's
  // "new" highlights until you leave.
  useEffect(() => () => markSeen(), [markSeen]);

  return (
    <div>
      <button className="artist-back" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <div className="page-head">
        <div>
          <div className="eyebrow">Activity</div>
          <h1 className="display page-title">Notifications</h1>
        </div>
      </div>

      {items === null ? (
        <Loader label="Checking in" />
      ) : items.length === 0 ? (
        <div className="people-empty">
          <p>Nothing yet. When people like, comment on or save your sets — or tag you — it shows up here.</p>
        </div>
      ) : (
        <ul className="activity-list">
          {items.map((i) => (
            <li key={i.id} className={`activity-item ${i.kind}${i.at > seenAt ? " new" : ""}`}>
              <Link to={`/u/${i.user.id}`} className="activity-avatar">
                <UserAvatar id={i.user.id} name={i.user.name} size={40} />
                <span className="activity-icon" aria-hidden="true">
                  {ICON[i.kind]}
                </span>
              </Link>
              <Link to={i.kind === "tag" ? "/" : `/set/${i.logId}${i.kind === "comment" ? "#comments" : ""}`} className="activity-text">
                <span>
                  <b>@{i.user.name}</b> {VERB[i.kind]} <b>{i.artist}</b> set
                  {i.kind === "save" && " to Want to see"}
                  {i.kind === "tag" && " — rank it too"}
                </span>
                {i.text && <q>{i.text}</q>}
                <small>{timeAgo(i.at)}</small>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
