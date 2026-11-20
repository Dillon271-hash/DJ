import { create } from "zustand";
import { supabase } from "./supabase";
import { useEncoreStore } from "./store";
import { namesFor } from "./social";
import { useTagInvites } from "./tags";

// Notifications: people liking, commenting on, or saving your sets, and
// tagging you in theirs. Built from those tables directly (no separate
// notifications table); "seen" is remembered per device.

export type ActivityKind = "like" | "comment" | "save" | "tag";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  at: number;
  user: { id: string; name: string };
  logId: string;
  artist: string;
  text?: string;
}

interface ActivityState {
  items: ActivityItem[] | null;
  seenAt: number;
  load: () => Promise<void>;
  markSeen: () => void;
}

const seenKey = (me: string) => `disko-activity-seen-${me}`;
const readSeen = (me: string) => {
  try {
    return Number(localStorage.getItem(seenKey(me)) ?? 0) || 0;
  } catch {
    return 0;
  }
};

export const useActivity = create<ActivityState>()((set) => ({
  items: null,
  seenAt: 0,

  load: async () => {
    const store = useEncoreStore.getState();
    const me = store.session?.user.id;
    if (!supabase || !me) return;
    const mine = store.logs;
    const artistOf = new Map(mine.map((l) => [l.id, l.artist]));
    const ids = mine.map((l) => l.id).slice(-300);
    const since = new Date(Date.now() - 60 * 86_400_000).toISOString();

    const [likes, comments, saves] = ids.length
      ? await Promise.all([
          supabase.from("log_likes").select("log_id, user_id, created_at").in("log_id", ids).neq("user_id", me).gte("created_at", since).limit(100),
          supabase.from("log_comments").select("id, log_id, user_id, body, created_at").in("log_id", ids).neq("user_id", me).gte("created_at", since).limit(100),
          supabase.from("saved_sets").select("log_id, user_id, created_at").in("log_id", ids).neq("user_id", me).gte("created_at", since).limit(100),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];

    type Row = { log_id: string; user_id: string; created_at: string; id?: string; body?: string };
    const rows = (r: { data: unknown }) => (Array.isArray(r.data) ? (r.data as Row[]) : []);
    const tags = useTagInvites.getState().invites ?? [];
    const userIds = new Set<string>([...rows(likes), ...rows(comments), ...rows(saves)].map((r) => r.user_id));
    tags.forEach((t) => userIds.add(t.by.id));
    const names = await namesFor([...userIds]).catch(() => new Map<string, string>());
    const who = (id: string) => ({ id, name: names.get(id) ?? "Disko user" });

    const items: ActivityItem[] = [
      ...rows(likes).map((r) => ({ id: `like-${r.log_id}-${r.user_id}`, kind: "like" as const, at: Date.parse(r.created_at), user: who(r.user_id), logId: r.log_id, artist: artistOf.get(r.log_id) ?? "your set" })),
      ...rows(comments).map((r) => ({ id: `comment-${r.id}`, kind: "comment" as const, at: Date.parse(r.created_at), user: who(r.user_id), logId: r.log_id, artist: artistOf.get(r.log_id) ?? "your set", text: r.body })),
      ...rows(saves).map((r) => ({ id: `save-${r.log_id}-${r.user_id}`, kind: "save" as const, at: Date.parse(r.created_at), user: who(r.user_id), logId: r.log_id, artist: artistOf.get(r.log_id) ?? "your set" })),
      ...tags.map((t) => ({ id: `tag-${t.logId}`, kind: "tag" as const, at: t.createdAt, user: t.by, logId: t.logId, artist: t.artist })),
    ].sort((a, b) => b.at - a.at);

    set({ items, seenAt: readSeen(me) });
  },

  markSeen: () => {
    const me = useEncoreStore.getState().session?.user.id;
    if (!me) return;
    const now = Date.now();
    try {
      localStorage.setItem(seenKey(me), String(now));
    } catch {
      // ignore
    }
    set({ seenAt: now });
  },
}));

export function useUnreadCount(): number {
  const items = useActivity((s) => s.items);
  const seenAt = useActivity((s) => s.seenAt);
  return (items ?? []).filter((i) => i.at > seenAt).length;
}

// Load after sign-in (once your logs are in), refresh every minute and
// when the app comes back to the foreground.
let started = false;
function start() {
  if (started) return;
  started = true;
  const refresh = () => {
    if (useEncoreStore.getState().session && !useEncoreStore.getState().logsLoading) useActivity.getState().load();
  };
  useEncoreStore.subscribe((s, prev) => {
    if (s.session && !s.logsLoading && (prev.logsLoading || !prev.session)) refresh();
    if (!s.session && prev.session) useActivity.setState({ items: null, seenAt: 0 });
  });
  useTagInvites.subscribe((s, prev) => {
    if (s.invites !== prev.invites) refresh();
  });
  window.setInterval(refresh, 60_000);
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && refresh());
  refresh();
}
start();
