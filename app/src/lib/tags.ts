import { create } from "zustand";
import { supabase } from "./supabase";
import { useEncoreStore, type LogRow } from "./store";
import { namesFor, type Mini } from "./social";
import { normalizeArtist } from "./genres";
import type { SetLog } from "./types";

// "You were tagged": sets other people logged with you tagged in them,
// that you haven't logged yourself yet. Tapping one opens the log flow
// with the artist, venue, date and who you were with already filled in.

export interface TagInvite {
  logId: string;
  artist: string;
  event: string;
  date: string;
  by: Mini;
  /** Everyone else tagged on it (Disko users), for pre-filling "with". */
  others: Mini[];
  createdAt: number;
}

const LOCAL_KEY = "disko-dismissed-tags";
const localDismissed = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]");
  } catch {
    return [];
  }
};

interface TagState {
  invites: TagInvite[] | null;
  dismissed: Set<string>;
  load: () => Promise<void>;
  dismiss: (logId: string) => Promise<void>;
}

export const useTagInvites = create<TagState>()((set, get) => ({
  invites: null,
  dismissed: new Set(),

  load: async () => {
    const me = useEncoreStore.getState().session?.user.id;
    if (!supabase || !me) return;
    const since = new Date(Date.now() - 60 * 86_400_000).toISOString();
    const [logsRes, dismissRes] = await Promise.all([
      supabase
        .from("logs")
        .select("*")
        .contains("with_user_ids", [me])
        .neq("user_id", me)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase.from("tag_dismissals").select("log_id"),
    ]);
    if (logsRes.error) {
      set({ invites: [] });
      return;
    }
    const dismissed = new Set<string>(localDismissed());
    if (!dismissRes.error && Array.isArray(dismissRes.data)) for (const r of dismissRes.data as { log_id: string }[]) dismissed.add(r.log_id);

    const rows = logsRes.data as LogRow[];
    const ids = new Set<string>();
    for (const r of rows) {
      ids.add(r.user_id!);
      for (const u of r.with_user_ids ?? []) if (u !== me) ids.add(u);
    }
    const names = await namesFor([...ids]).catch(() => new Map<string, string>());
    const name = (id: string) => names.get(id) ?? "Disko user";
    set({
      dismissed,
      invites: rows.map((r) => ({
        logId: r.id,
        artist: r.artist,
        event: r.event,
        date: r.date,
        by: { id: r.user_id!, name: name(r.user_id!) },
        others: (r.with_user_ids ?? []).filter((u) => u !== me).map((u) => ({ id: u, name: name(u) })),
        createdAt: new Date(r.created_at).getTime(),
      })),
    });
  },

  dismiss: async (logId) => {
    const dismissed = new Set(get().dismissed).add(logId);
    set({ dismissed });
    const { error } = supabase ? await supabase.from("tag_dismissals").insert({ log_id: logId }) : { error: null };
    // No table yet (schema.sql not re-run) — remember it on this device.
    if (error) {
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify([...dismissed].slice(-200)));
      } catch {
        // ignore
      }
    }
  },
}));

/** Invites still open: not dismissed, and not already logged by you (same artist, same day). */
export function openInvites(invites: TagInvite[] | null, dismissed: Set<string>, mine: SetLog[]): TagInvite[] {
  if (!invites) return [];
  const logged = new Set(mine.map((l) => `${normalizeArtist(l.artist)}|${l.date}`));
  const seen = new Set<string>();
  return invites.filter((i) => {
    const key = `${normalizeArtist(i.artist)}|${i.date}`;
    if (dismissed.has(i.logId) || logged.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function useOpenInvites(): TagInvite[] {
  const invites = useTagInvites((s) => s.invites);
  const dismissed = useTagInvites((s) => s.dismissed);
  const mine = useEncoreStore((s) => s.logs);
  // Cheap enough to recompute; the lists are tiny.
  return openInvites(invites, dismissed, mine);
}

/** Router state the log flow reads to pre-fill a tagged set. */
export interface FromTag {
  logId: string;
  event: string;
  date: string;
  by: Mini;
  with: Mini[];
}

export function logFromTagPath(i: TagInvite): { to: string; state: { fromTag: FromTag } } {
  return {
    to: `/log/${encodeURIComponent(i.artist)}`,
    state: { fromTag: { logId: i.logId, event: i.event, date: i.date, by: i.by, with: [i.by, ...i.others] } },
  };
}

// Load after sign-in.
let lastUser: string | undefined;
const sync = (id: string | undefined) => {
  if (id === lastUser) return;
  lastUser = id;
  if (id) useTagInvites.getState().load();
  else useTagInvites.setState({ invites: null, dismissed: new Set() });
};
useEncoreStore.subscribe((s) => sync(s.session?.user.id));
sync(useEncoreStore.getState().session?.user.id);
