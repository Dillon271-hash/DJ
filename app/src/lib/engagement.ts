import { create } from "zustand";
import { supabase } from "./supabase";
import { useEncoreStore } from "./store";
import type { SetLog } from "./types";

// Likes, comments and sharing on logged sets. Counts live in one small
// store keyed by log id so a feed card and the set page stay in sync.

export interface Engagement {
  likes: number;
  liked: boolean;
  comments: number;
}

export interface Comment {
  id: string;
  logId: string;
  userId: string;
  name: string;
  body: string;
  createdAt: number;
}

const EMPTY: Engagement = { likes: 0, liked: false, comments: 0 };

interface EngagementState {
  byLog: Record<string, Engagement>;
  /** False until schema.sql has the likes/comments tables. */
  available: boolean;
  load: (logIds: string[]) => Promise<void>;
  toggleLike: (logId: string) => Promise<void>;
  bumpComments: (logId: string, delta: number) => void;
}

const loading = new Set<string>();
const queued = new Set<string>();
let flushScheduled = false;

export const useEngagement = create<EngagementState>()((set, get) => ({
  byLog: {},
  available: true,

  // Calls made in the same moment (every card in a feed) are batched into
  // one pair of queries.
  load: async (logIds) => {
    for (const id of logIds) if (!(id in get().byLog) && !loading.has(id)) queued.add(id);
    if (queued.size === 0 || flushScheduled) return;
    flushScheduled = true;
    await new Promise((r) => setTimeout(r, 0));
    flushScheduled = false;
    const ids = [...queued];
    queued.clear();
    const me = useEncoreStore.getState().session?.user.id;
    if (!supabase || !me || ids.length === 0 || !get().available) return;
    ids.forEach((id) => loading.add(id));
    try {
      const [likes, comments] = await Promise.all([
        supabase.from("log_likes").select("log_id, user_id").in("log_id", ids),
        supabase.from("log_comments").select("log_id").in("log_id", ids),
      ]);
      if (likes.error || comments.error) {
        const code = likes.error?.code ?? comments.error?.code;
        if (code === "PGRST205" || code === "42P01") set({ available: false });
        return;
      }
      const next = { ...get().byLog };
      for (const id of ids) next[id] = { ...EMPTY };
      for (const r of likes.data as { log_id: string; user_id: string }[]) {
        next[r.log_id].likes++;
        if (r.user_id === me) next[r.log_id].liked = true;
      }
      for (const r of comments.data as { log_id: string }[]) next[r.log_id].comments++;
      set({ byLog: next });
    } finally {
      ids.forEach((id) => loading.delete(id));
    }
  },

  toggleLike: async (logId) => {
    if (!supabase) return;
    const cur = get().byLog[logId] ?? EMPTY;
    const liked = !cur.liked;
    // Optimistic — flip now, undo if the server says no.
    set({ byLog: { ...get().byLog, [logId]: { ...cur, liked, likes: Math.max(0, cur.likes + (liked ? 1 : -1)) } } });
    const me = useEncoreStore.getState().session?.user.id;
    const { error } = liked
      ? await supabase.from("log_likes").insert({ log_id: logId })
      : await supabase.from("log_likes").delete().eq("log_id", logId).eq("user_id", me ?? "");
    if (error && error.code !== "23505") {
      console.error("[like]", error);
      set({ byLog: { ...get().byLog, [logId]: cur } });
    }
  },

  bumpComments: (logId, delta) => {
    const cur = get().byLog[logId] ?? EMPTY;
    set({ byLog: { ...get().byLog, [logId]: { ...cur, comments: Math.max(0, cur.comments + delta) } } });
  },
}));

export function useLogEngagement(logId: string): Engagement {
  return useEngagement((s) => s.byLog[logId]) ?? EMPTY;
}

export async function fetchComments(logId: string): Promise<Comment[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("log_comments")
    .select("id, log_id, user_id, body, created_at, who:profiles!log_comments_user_id_fkey(display_name)")
    .eq("log_id", logId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error || !data) return [];
  return (data as unknown as {
    id: string;
    log_id: string;
    user_id: string;
    body: string;
    created_at: string;
    who: { display_name: string } | null;
  }[]).map((r) => ({
    id: r.id,
    logId: r.log_id,
    userId: r.user_id,
    name: r.who?.display_name ?? "Disko user",
    body: r.body,
    createdAt: new Date(r.created_at).getTime(),
  }));
}

export async function addComment(logId: string, body: string): Promise<Comment | string> {
  const text = body.trim();
  if (!supabase || !text) return "Write something first.";
  if (text.length > 500) return "Keep it under 500 characters.";
  const { data, error } = await supabase
    .from("log_comments")
    .insert({ log_id: logId, body: text })
    .select("id, created_at")
    .single();
  if (error || !data) return "Couldn't post that — try again.";
  useEngagement.getState().bumpComments(logId, 1);
  const me = useEncoreStore.getState();
  return {
    id: (data as { id: string }).id,
    logId,
    userId: me.session?.user.id ?? "",
    name: me.username || "you",
    body: text,
    createdAt: new Date((data as { created_at: string }).created_at).getTime(),
  };
}

export async function deleteComment(c: Comment): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("log_comments").delete().eq("id", c.id);
  if (error) return false;
  useEngagement.getState().bumpComments(c.logId, -1);
  return true;
}

/** Native share sheet with a link to the set (copies the link where sharing isn't available). */
export async function shareSet(log: SetLog, ownerName?: string): Promise<"shared" | "copied" | "failed"> {
  const url = `${window.location.origin}/#/set/${log.id}`;
  const who = ownerName ? `@${ownerName}` : "I";
  const text = `${who} gave ${log.artist} a ${log.score.toFixed(1)} on Disko`;
  try {
    if (navigator.share) {
      await navigator.share({ title: `${log.artist} on Disko`, text, url });
      return "shared";
    }
    await navigator.clipboard.writeText(`${text} — ${url}`);
    return "copied";
  } catch (e) {
    // Closing the share sheet isn't a failure.
    return e instanceof DOMException && e.name === "AbortError" ? "shared" : "failed";
  }
}
