import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { addComment, deleteComment, fetchComments, useEngagement, type Comment } from "../lib/engagement";
import { useEncoreStore } from "../lib/store";
import { timeAgo } from "../lib/dates";
import { UserAvatar } from "./UserAvatar";
import { Busy } from "./Vinyl";

// The comment thread on a set page.
export function Comments({ logId, ownerId, autoFocus = false }: { logId: string; ownerId: string; autoFocus?: boolean }) {
  const me = useEncoreStore((s) => s.session?.user.id ?? "");
  const available = useEngagement((s) => s.available);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let stale = false;
    fetchComments(logId).then((c) => !stale && setComments(c));
    return () => {
      stale = true;
    };
  }, [logId]);

  useEffect(() => {
    if (autoFocus) input.current?.focus({ preventScroll: false });
  }, [autoFocus]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || posting) return;
    setPosting(true);
    setError(null);
    const r = await addComment(logId, text);
    setPosting(false);
    if (typeof r === "string") return setError(r);
    setComments((c) => [...(c ?? []), r]);
    setText("");
  }

  async function remove(c: Comment) {
    if (await deleteComment(c)) setComments((list) => (list ?? []).filter((x) => x.id !== c.id));
  }

  if (!available) return null;

  return (
    <section className="comments" id="comments">
      <div className="section-label">
        Comments {comments && comments.length > 0 && <span className="muted">{comments.length}</span>}
      </div>
      {comments === null ? null : comments.length === 0 ? (
        <p className="hint">No comments yet — start the conversation.</p>
      ) : (
        <ul className="comment-list">
          {comments.map((c) => (
            <li key={c.id} className="comment">
              <Link to={c.userId === me ? "/rankings" : `/u/${c.userId}`}>
                <UserAvatar id={c.userId} name={c.name} size={32} />
              </Link>
              <div className="comment-body">
                <div className="comment-head">
                  <Link to={c.userId === me ? "/rankings" : `/u/${c.userId}`}>@{c.name}</Link>
                  <span>{timeAgo(c.createdAt)}</span>
                  {(c.userId === me || ownerId === me) && (
                    <button type="button" className="text-btn" onClick={() => remove(c)}>
                      Delete
                    </button>
                  )}
                </div>
                <p>{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form className="comment-form" onSubmit={submit}>
        <textarea
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment…"
          maxLength={500}
          rows={1}
          aria-label="Add a comment"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) submit(e);
          }}
        />
        <button type="submit" className="plus-btn compact" disabled={!text.trim() || posting}>
          {posting ? <Busy>Posting</Busy> : "Post"}
        </button>
      </form>
      {error && <p className="flow-error">{error}</p>}
    </section>
  );
}
