import { supabase } from "./supabase";
import { rowToLog, type LogRow } from "./store";
import type { SetLog } from "./types";

// Reading other people's profiles and rankings. Loaded only with the
// People / profile / shared-set pages. Every query here relies on the
// "Signed-in users can view all logs" policy in supabase/schema.sql — if
// that hasn't been run yet, other people's logs just come back empty.

export interface Person {
  id: string;
  name: string;
  setCount: number;
  topArtist?: string;
  lastLoggedAt?: number;
}

export interface FeedItem {
  log: SetLog;
  person: { id: string; name: string };
}

export class SocialSetupError extends Error {}

function db() {
  if (!supabase) throw new Error("Supabase isn't configured.");
  return supabase;
}

// A missing profiles table means schema.sql hasn't been re-run since
// People shipped — surfaced as its own error so the page can say so.
function check<T>(error: { code?: string; message: string } | null, data: T | null): T {
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") throw new SocialSetupError(error.message);
    throw new Error(error.message);
  }
  return data as T;
}

const peopleCache = new Map<string, Promise<Person[]>>();

/** Everyone on Encore except me, most active first. */
export function fetchPeople(meId: string): Promise<Person[]> {
  const cached = peopleCache.get(meId);
  if (cached) return cached;
  const promise = (async () => {
    const [profiles, logs] = await Promise.all([
      db().from("profiles").select("id, display_name").neq("id", meId).limit(500),
      db()
        .from("logs")
        .select("user_id, artist, score, created_at")
        .neq("user_id", meId)
        .order("created_at", { ascending: false })
        .limit(5000),
    ]);
    const profileRows = check(profiles.error, profiles.data) as { id: string; display_name: string }[];
    const logRows = (logs.error ? [] : logs.data) as { user_id: string; artist: string; score: number; created_at: string }[];

    const stats = new Map<string, { count: number; top?: { artist: string; score: number }; last?: number }>();
    for (const row of logRows) {
      const s = stats.get(row.user_id) ?? { count: 0 };
      s.count++;
      if (!s.top || row.score > s.top.score) s.top = { artist: row.artist, score: row.score };
      s.last ??= new Date(row.created_at).getTime();
      stats.set(row.user_id, s);
    }
    return profileRows
      .map((p) => {
        const s = stats.get(p.id);
        return { id: p.id, name: p.display_name, setCount: s?.count ?? 0, topArtist: s?.top?.artist, lastLoggedAt: s?.last };
      })
      .sort((a, b) => b.setCount - a.setCount || (b.lastLoggedAt ?? 0) - (a.lastLoggedAt ?? 0) || a.name.localeCompare(b.name));
  })();
  peopleCache.set(meId, promise);
  // Don't keep a failure around — the next visit should try again.
  promise.catch(() => peopleCache.delete(meId));
  // Fresh enough for flipping between pages, refetched after a minute.
  setTimeout(() => peopleCache.delete(meId), 60_000);
  return promise;
}

async function namesFor(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await db().from("profiles").select("id, display_name").in("id", ids);
  const rows = check(error, data) as { id: string; display_name: string }[];
  return new Map(rows.map((r) => [r.id, r.display_name]));
}

/** Latest sets logged by everyone else. */
export async function fetchFeed(meId: string, limit = 30): Promise<FeedItem[]> {
  const { data, error } = await db()
    .from("logs")
    .select("*")
    .neq("user_id", meId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = check(error, data) as LogRow[];
  const names = await namesFor([...new Set(rows.map((r) => r.user_id!).filter(Boolean))]);
  return rows.map((row) => ({
    log: rowToLog(row),
    person: { id: row.user_id!, name: names.get(row.user_id!) ?? "Encore user" },
  }));
}

/** One person's name and every set they've logged. */
export async function fetchUserRankings(userId: string): Promise<{ name: string; logs: SetLog[] } | null> {
  const [profile, logs] = await Promise.all([
    db().from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    db().from("logs").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
  ]);
  const p = check(profile.error, profile.data) as { display_name: string } | null;
  if (!p) return null;
  return { name: p.display_name, logs: (check(logs.error, logs.data) as LogRow[]).map(rowToLog) };
}

/** A set someone else logged, plus the rest of their logs (for its ranks). */
export async function fetchSharedSet(
  logId: string,
): Promise<{ log: SetLog; owner: { id: string; name: string }; ownerLogs: SetLog[] } | null> {
  const { data, error } = await db().from("logs").select("user_id").eq("id", logId).maybeSingle();
  const row = check(error, data) as { user_id: string } | null;
  if (!row) return null;
  const rankings = await fetchUserRankings(row.user_id);
  const log = rankings?.logs.find((l) => l.id === logId);
  if (!rankings || !log) return null;
  return { log, owner: { id: row.user_id, name: rankings.name }, ownerLogs: rankings.logs };
}
