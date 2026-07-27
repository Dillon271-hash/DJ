import { create } from "zustand";
import type { SupabaseClient, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Bucket, DraftLog, SetLog } from "./types";

// Every store action below only runs once App.tsx has confirmed
// isSupabaseConfigured and mounted the rest of the app, so `supabase` is
// never actually null here — this just gives a clear error instead of a
// bare "Cannot read properties of null" if that invariant is ever broken.
function client(): SupabaseClient {
  if (!supabase) throw new Error("Supabase isn't configured — see .env.example.");
  return supabase;
}

// Row shape as stored in Postgres (snake_case) — see supabase/schema.sql.
interface LogRow {
  id: string;
  artist: string;
  event: string;
  date: string;
  labels: string[] | null;
  with_who: string | null;
  note: string | null;
  bucket: Bucket;
  score: number;
  venue_bucket: Bucket | null;
  venue_score: number | null;
  created_at: string;
}

function rowToLog(row: LogRow): SetLog {
  return {
    id: row.id,
    artist: row.artist,
    event: row.event,
    date: row.date,
    labels: row.labels ?? undefined,
    withWho: row.with_who ?? undefined,
    note: row.note ?? undefined,
    bucket: row.bucket,
    score: row.score,
    venueBucket: row.venue_bucket ?? undefined,
    venueScore: row.venue_score ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export interface FestivalSession {
  event: string;
  date: string;
  venueBucket: Bucket;
  venueScore: number;
}

interface EncoreStore {
  session: Session | null;
  authReady: boolean;
  logs: SetLog[];
  logsLoading: boolean;
  init: () => void;
  signUp: (email: string, password: string, name: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  addLog: (
    draft: DraftLog,
    bucket: Bucket,
    score: number,
    venueBucket?: Bucket,
    venueScore?: number,
  ) => Promise<SetLog | null>;
  removeLog: (id: string) => Promise<void>;
  // Not persisted anywhere (not localStorage, not Supabase) — purely
  // in-memory so logging several DJs from the same festival visit in a
  // row doesn't re-ask for the venue/date or re-run the venue rating
  // comparison every single time. Clears itself on page reload.
  festivalSession: FestivalSession | null;
  setFestivalSession: (session: FestivalSession) => void;
  clearFestivalSession: () => void;
}

let authListenerStarted = false;

export const useEncoreStore = create<EncoreStore>()((set, get) => ({
  session: null,
  authReady: false,
  logs: [],
  logsLoading: false,

  init: () => {
    if (authListenerStarted) return;
    authListenerStarted = true;
    client().auth.onAuthStateChange((_event, session) => {
      set({ session, authReady: true });
      if (session) {
        fetchLogs();
      } else {
        set({ logs: [] });
      }
    });
  },

  signUp: async (email, password, name) => {
    const { error } = await client().auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    return error?.message ?? null;
  },

  signIn: async (email, password) => {
    const { error } = await client().auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  },

  signOut: async () => {
    await client().auth.signOut();
  },

  addLog: async (draft, bucket, score, venueBucket, venueScore) => {
    const { data, error } = await client()
      .from("logs")
      .insert({
        artist: draft.artist,
        event: draft.event,
        date: draft.date,
        labels: draft.labels ?? null,
        with_who: draft.withWho ?? null,
        note: draft.note ?? null,
        bucket,
        score,
        venue_bucket: venueBucket ?? null,
        venue_score: venueScore ?? null,
      })
      .select()
      .single();
    if (error || !data) {
      console.error("[logs] insert failed:", error);
      return null;
    }
    const entry = rowToLog(data as LogRow);
    set({ logs: [...get().logs, entry] });
    return entry;
  },

  removeLog: async (id) => {
    const { error } = await client().from("logs").delete().eq("id", id);
    if (error) {
      console.error("[logs] delete failed:", error);
      return;
    }
    set({ logs: get().logs.filter((l) => l.id !== id) });
  },

  festivalSession: null,
  setFestivalSession: (session) => set({ festivalSession: session }),
  clearFestivalSession: () => set({ festivalSession: null }),
}));

async function fetchLogs() {
  useEncoreStore.setState({ logsLoading: true });
  const { data, error } = await client().from("logs").select("*").order("created_at", { ascending: true });
  if (error) {
    console.error("[logs] fetch failed:", error);
    useEncoreStore.setState({ logs: [], logsLoading: false });
    return;
  }
  useEncoreStore.setState({ logs: (data as LogRow[]).map(rowToLog), logsLoading: false });
}
