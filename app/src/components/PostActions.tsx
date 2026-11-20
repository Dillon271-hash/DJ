import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { shareSet, useEngagement, useLogEngagement } from "../lib/engagement";
import type { SetLog } from "../lib/types";
import { useSaved } from "../lib/saved";
import { useEncoreStore } from "../lib/store";

// ♥ like · 💬 comment · ↗ share — under every post.
export function PostActions({
  log,
  ownerName,
  onComment,
}: {
  log: SetLog;
  ownerName?: string;
  /** Defaults to opening the set page's comments. */
  onComment?: () => void;
}) {
  const navigate = useNavigate();
  const { likes, liked, comments } = useLogEngagement(log.id);
  const available = useEngagement((s) => s.available);
  const load = useEngagement((s) => s.load);
  const toggleLike = useEngagement((s) => s.toggleLike);
  const [toast, setToast] = useState<string | null>(null);
  const me = useEncoreStore((s) => s.session?.user.id ?? "");
  const saved = useSaved((s) => s.ids?.has(log.id) ?? false);
  const savedAvailable = useSaved((s) => s.available);
  const toggleSave = useSaved((s) => s.toggle);
  const [pop, setPop] = useState(false);

  useEffect(() => {
    load([log.id]);
  }, [log.id, load]);

  async function share() {
    const r = await shareSet(log, ownerName);
    if (r === "copied") setToast("Link copied");
    if (r === "failed") setToast("Couldn't share");
    if (r !== "shared") window.setTimeout(() => setToast(null), 1800);
  }

  return (
    <div className="post-actions">
      {available && (
        <>
          <button
            type="button"
            className={`post-action like${liked ? " on" : ""}${pop ? " pop" : ""}`}
            aria-pressed={liked}
            aria-label={liked ? "Unlike" : "Like"}
            onClick={() => {
              if (!liked) {
                setPop(true);
                window.setTimeout(() => setPop(false), 400);
              }
              toggleLike(log.id);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 20.6 10.7 19.4C6 15.2 3 12.5 3 9.2 3 6.5 5.1 4.4 7.8 4.4c1.5 0 3 .7 4.2 1.9 1.2-1.2 2.7-1.9 4.2-1.9 2.7 0 4.8 2.1 4.8 4.8 0 3.3-3 6-7.7 10.2L12 20.6z" />
            </svg>
            {likes > 0 && <span>{likes}</span>}
          </button>
          <button
            type="button"
            className="post-action"
            aria-label="Comments"
            onClick={() => (onComment ? onComment() : navigate(`/set/${log.id}#comments`))}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 5h16v11H9l-5 4V5z" />
            </svg>
            {comments > 0 && <span>{comments}</span>}
          </button>
        </>
      )}
      {savedAvailable && log.userId !== me && (
        <button
          type="button"
          className={`post-action save${saved ? " on" : ""}`}
          aria-pressed={saved}
          aria-label={saved ? "Remove from Want to see" : "Save to Want to see"}
          title={saved ? "Saved to Want to see" : "Save to Want to see"}
          onClick={() => {
            toggleSave(log.id);
            if (!saved) {
              setToast("Saved to Want to see");
              window.setTimeout(() => setToast(null), 1600);
            }
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 3.5h12v17l-6-4.2-6 4.2z" />
          </svg>
        </button>
      )}
      <button type="button" className="post-action" aria-label="Share" onClick={share}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3v12M7 8l5-5 5 5M5 13v6h14v-6" />
        </svg>
      </button>
      {toast && <span className="post-toast">{toast}</span>}
    </div>
  );
}
