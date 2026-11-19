import { create } from "zustand";
import type { SupabaseClient, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { deleteSetMedia } from "./media";
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
  with_user_ids?: string[] | null;
  note: string | null;
  bucket: Bucket;
  score: number;
  venue_bucket: Bucket | null;
  venue_score: number | null;
  media_paths: string[] | null;
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
    withUserIds: row.with_user_ids ?? undefined,
    note: row.note ?? undefined,
    bucket: row.bucket,
    score: row.score,
    venueBucket: row.venue_bucket ?? undefined,
    venueScore: row.venue_score ?? undefined,
    mediaPaths: row.media_paths ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export interface ProfileMatch {
  id: string;
  name: string;
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
  signUp: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ error: string | null; existingAccount: boolean }>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  // True while the user has arrived via a password-reset email link and
  // hasn't chosen a new password yet — App shows the reset screen instead
  // of the app, even though the link has already signed them in.
  passwordRecovery: boolean;
  // Message from an expired/already-used email link, shown on the sign-in
  // screen so the user knows why the link didn't work.
  authLinkError: string | null;
  clearAuthLinkError: () => void;
  requestPasswordReset: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  addLog: (
    draft: DraftLog,
    bucket: Bucket,
    score: number,
    venueBucket?: Bucket,
    venueScore?: number,
    mediaPaths?: string[],
  ) => Promise<SetLog | null>;
  removeLog: (id: string) => Promise<void>;
  searchProfiles: (query: string) => Promise<ProfileMatch[]>;
  // Not persisted anywhere (not localStorage, not Supabase) — purely
  // in-memory so logging several DJs from the same festival visit in a
  // row doesn't re-ask for the venue/date or re-run the venue rating
  // comparison every single time. Clears itself on page reload.
  festivalSession: FestivalSession | null;
  setFestivalSession: (session: FestivalSession) => void;
  clearFestivalSession: () => void;
}

let authListenerStarted = false;

// Supabase email links (sign-up confirmation, password reset) land back
// here with their result in the URL fragment, e.g.
// "#access_token=…&type=recovery" or "#error_description=…". That's the
// same fragment HashRouter uses for pages, so read it once at startup:
// supabase-js clears a successful one itself once it has the session, but
// an error one would otherwise linger and be treated as a page path.
const linkParams = new URLSearchParams(
  typeof window === "undefined" ? "" : window.location.hash.replace(/^#/, ""),
);
const arrivedViaResetLink = linkParams.get("type") === "recovery";
const initialLinkError = linkParams.get("error_description");
if (initialLinkError) {
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#/`);
}

export const useEncoreStore = create<EncoreStore>()((set, get) => ({
  session: null,
  authReady: false,
  logs: [],
  logsLoading: false,
  passwordRecovery: arrivedViaResetLink,
  authLinkError: initialLinkError,

  init: () => {
    if (authListenerStarted) return;
    authListenerStarted = true;
    client().auth.onAuthStateChange((event, session) => {
      set({ session, authReady: true });
      if (event === "PASSWORD_RECOVERY") set({ passwordRecovery: true });
      if (session) {
        fetchLogs();
      } else {
        set({ logs: [] });
      }
    });
  },

  signUp: async (email, password, name) => {
    const { data, error } = await client().auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    // Supabase signals "this email already has an account" one of two
    // ways depending on project settings: a user_already_exists error, or
    // (when email *and* phone confirmation are both on) a fake success
    // whose user has no identities and for which no email is sent.
    const existingAccount = error?.code === "user_already_exists" || data.user?.identities?.length === 0;
    if (existingAccount) return { error: null, existingAccount: true };
    return { error: error?.message ?? null, existingAccount: false };
  },

  signIn: async (email, password) => {
    const { error } = await client().auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  },

  signOut: async () => {
    await client().auth.signOut();
  },

  clearAuthLinkError: () => set({ authLinkError: null }),

  requestPasswordReset: async (email) => {
    // The link brings them back to whichever copy of the app they asked
    // from (the Vercel site, or localhost while developing) — each needs
    // to be listed under Supabase → Authentication → URL Configuration →
    // Redirect URLs, or Supabase falls back to the Site URL.
    const { error } = await client().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    return error?.message ?? null;
  },

  updatePassword: async (password) => {
    const { error } = await client().auth.updateUser({ password });
    if (error) return error.message;
    set({ passwordRecovery: false });
    return null;
  },

  addLog: async (draft, bucket, score, venueBucket, venueScore, mediaPaths) => {
    const base = {
      artist: draft.artist,
      event: draft.event,
      date: draft.date,
      with_who: draft.withWho ?? null,
      note: draft.note ?? null,
      bucket,
      score,
      venue_bucket: venueBucket ?? null,
      venue_score: venueScore ?? null,
    };
    // Newer columns are only sent when they have something in them, so a
    // project that hasn't re-run schema.sql yet can still save plain sets.
    const full = {
      ...base,
      ...(draft.withUserIds?.length ? { with_user_ids: draft.withUserIds } : {}),
      ...(mediaPaths?.length ? { media_paths: mediaPaths } : {}),
    };
    const insert = (row: typeof full) => client().from("logs").insert(row).select().single();
    let { data, error } = await insert(full);
    // PGRST204 = "column not found" — schema.sql hasn't been re-run since
    // tagging/media were added. Save the set without those extras rather
    // than losing it entirely (names still live on in with_who).
    if (error?.code === "PGRST204") {
      console.warn("[logs] missing column, saving without tags/media — re-run supabase/schema.sql:", error.message);
      ({ data, error } = await insert(base));
    }
    if (error || !data) {
      console.error("[logs] insert failed:", error);
      return null;
    }
    const entry = rowToLog(data as LogRow);
    set({ logs: [...get().logs, entry] });
    return entry;
  },

  removeLog: async (id) => {
    const existing = get().logs.find((l) => l.id === id);
    // Best-effort — a failed storage cleanup shouldn't block deleting the
    // log itself, it just leaves orphaned files behind.
    if (existing?.mediaPaths?.length) await deleteSetMedia(existing.mediaPaths);

    const { error } = await client().from("logs").delete().eq("id", id);
    if (error) {
      console.error("[logs] delete failed:", error);
      return;
    }
    set({ logs: get().logs.filter((l) => l.id !== id) });
  },

  searchProfiles: async (query) => {
    // Escape LIKE wildcards so typing "%" or "_" searches for them literally.
    const term = query.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
    if (!term) return [];
    let request = client().from("profiles").select("id, display_name").ilike("display_name", `%${term}%`).limit(6);
    const me = get().session?.user.id;
    if (me) request = request.neq("id", me);
    const { data, error } = await request;
    // Most likely the profiles table doesn't exist yet (schema.sql not
    // re-run) — tagging just falls back to typed-in names until it does.
    if (error || !data) return [];
    return (data as { id: string; display_name: string }[]).map((p) => ({ id: p.id, name: p.display_name }));
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
