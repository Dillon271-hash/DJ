import { create } from "zustand";
import { supabase } from "./supabase";
import { useEncoreStore, rowToLog, type LogRow } from "./store";
import { namesFor, type FeedItem } from "./social";

// Want to see: sets you've saved from other people. The ids load once
// after sign-in so every bookmark button knows its state.

interface SavedState {
  ids: Set<string> | null;
  available: boolean;
  load: () => Promise<void>;
  toggle: (logId: string) => Promise<void>;
}

export const useSaved = create<SavedState>()((set, get) => ({
  ids: null,
  available: true,

  load: async () => {
    const me = useEncoreStore.getState().session?.user.id;
    if (!supabase || !me) return;
    const { data, error } = await supabase.from("saved_sets").select("log_id").eq("user_id", me);
    if (error) {
      set({ ids: new Set(), available: error.code !== "PGRST205" && error.code !== "42P01" });
      return;
    }
    set({ ids: new Set((data as { log_id: string }[]).map((r) => r.log_id)) });
  },

  toggle: async (logId) => {
    if (!supabase) return;
    const me = useEncoreStore.getState().session?.user.id ?? "";
    const before = get().ids ?? new Set<string>();
    const saving = !before.has(logId);
    const next = new Set(before);
    if (saving) next.add(logId);
    else next.delete(logId);
    set({ ids: next });
    const { error } = saving
      ? await supabase.from("saved_sets").insert({ log_id: logId })
      : await supabase.from("saved_sets").delete().eq("log_id", logId).eq("user_id", me);
    if (error && error.code !== "23505") {
      console.error("[save]", error);
      set({ ids: before });
    }
  },
}));

/** Your saved sets, newest save first, with who logged them. */
export async function fetchSavedSets(): Promise<(FeedItem & { savedAt: number })[]> {
  const me = useEncoreStore.getState().session?.user.id;
  if (!supabase || !me) return [];
  const { data, error } = await supabase
    .from("saved_sets")
    .select("created_at, log:logs(*)")
    .eq("user_id", me)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error || !data) return [];
  const rows = (data as unknown as { created_at: string; log: LogRow | null }[]).filter((r) => r.log);
  const names = await namesFor([...new Set(rows.map((r) => r.log!.user_id!))]).catch(() => new Map<string, string>());
  return rows.map((r) => ({
    log: rowToLog(r.log!),
    person: { id: r.log!.user_id!, name: names.get(r.log!.user_id!) ?? "Disko user" },
    savedAt: new Date(r.created_at).getTime(),
  }));
}

let lastUser: string | undefined;
const sync = (id: string | undefined) => {
  if (id === lastUser) return;
  lastUser = id;
  if (id) useSaved.getState().load();
  else useSaved.setState({ ids: null });
};
useEncoreStore.subscribe((s) => sync(s.session?.user.id));
sync(useEncoreStore.getState().session?.user.id);
