import { create } from "zustand";
import { supabase } from "./supabase";
import { rowToLog, useEncoreStore, type LogRow } from "./store";
import { namesFor, type FeedItem } from "./social";
import type { CommunityLog } from "./recommend";
import { SEED_VENUES } from "./venues";

// Discover's data: your city, everyone's ratings (for recommendations),
// what's been logged in your city, and upcoming shows near it.

function db() {
  if (!supabase) throw new Error("Supabase isn't configured.");
  return supabase;
}

const LOCAL_KEY = "disko-city";
const readLocal = () => {
  try {
    return localStorage.getItem(LOCAL_KEY);
  } catch {
    return null;
  }
};
const writeLocal = (v: string | null) => {
  try {
    if (v) localStorage.setItem(LOCAL_KEY, v);
    else localStorage.removeItem(LOCAL_KEY);
  } catch {
    // Private mode etc. — the profile copy is the real one anyway.
  }
};

interface CityState {
  /** undefined while loading, null when not set. */
  city: string | null | undefined;
  load: () => Promise<void>;
  save: (city: string | null) => Promise<void>;
}

// Saved on your profile (so it follows you between devices). If the
// database hasn't got the city column yet, it's kept on this device.
export const useCity = create<CityState>()((set) => ({
  city: undefined,
  load: async () => {
    const me = useEncoreStore.getState().session?.user.id;
    if (!me) return;
    const { data, error } = await db().from("profiles").select("city").eq("id", me).maybeSingle();
    if (error) {
      set({ city: readLocal() });
      return;
    }
    const city = (data as { city: string | null } | null)?.city ?? readLocal();
    set({ city });
  },
  save: async (city) => {
    const value = city?.trim() || null;
    set({ city: value });
    writeLocal(value);
    const me = useEncoreStore.getState().session?.user.id;
    if (!me) return;
    const { error } = await db().from("profiles").update({ city: value }).eq("id", me);
    if (error) console.warn("[city] saved on this device only — re-run schema.sql to sync it:", error.message);
  },
}));

let communityCache: { at: number; promise: Promise<CommunityLog[]> } | null = null;

/** Everyone's ratings, slimmed down — the input for recommendations. */
export function fetchCommunityLogs(): Promise<CommunityLog[]> {
  if (communityCache && Date.now() - communityCache.at < 120_000) return communityCache.promise;
  const promise = (async () => {
    const { data, error } = await db()
      .from("logs")
      .select("user_id, artist, score")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) return [];
    return (data as { user_id: string; artist: string; score: number }[]).map((r) => ({
      userId: r.user_id,
      artist: r.artist,
      score: r.score,
    }));
  })();
  communityCache = { at: Date.now(), promise };
  return promise;
}

export const cityName = (place: string) => place.split(",")[0].trim();

/** Sets anyone on Disko has logged at venues in this city, newest first. */
export async function fetchCityLogs(place: string): Promise<FeedItem[]> {
  const name = cityName(place).replace(/[\\%_]/g, (c) => `\\${c}`);
  if (!name) return [];
  const { data, error } = await db()
    .from("logs")
    .select("*")
    .ilike("event", `%${name}%`)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error || !data) return [];
  const rows = data as LogRow[];
  const names = await namesFor([...new Set(rows.map((r) => r.user_id!).filter(Boolean))]).catch(() => new Map<string, string>());
  return rows.map((row) => ({ log: rowToLog(row), person: { id: row.user_id!, name: names.get(row.user_id!) ?? "Disko user" } }));
}

export interface ShowListing {
  id: string;
  name: string;
  url: string;
  date: string | null;
  time: string | null;
  venue: string | null;
  city: string | null;
  image: string | null;
  artists: string[];
}

export interface EventsResult {
  configured: boolean;
  events: ShowListing[];
  error?: boolean;
}

const eventsCache = new Map<string, Promise<EventsResult>>();

export function fetchEvents(where: { place?: string; lat?: number; lng?: number }): Promise<EventsResult> {
  const qs = new URLSearchParams();
  if (where.lat !== undefined && where.lng !== undefined) {
    qs.set("lat", where.lat.toFixed(3));
    qs.set("lng", where.lng.toFixed(3));
  } else qs.set("place", where.place ?? "");
  const key = qs.toString();
  const cached = eventsCache.get(key);
  if (cached) return cached;
  const promise = fetch(`/api/events?${key}`)
    .then((r) => (r.ok ? (r.json() as Promise<EventsResult>) : { configured: false, events: [] }))
    .catch(() => ({ configured: false, events: [] }));
  eventsCache.set(key, promise);
  return promise;
}

/** Cities from the venue list, for the city picker's suggestions. */
export const KNOWN_CITIES: string[] = [...new Set(SEED_VENUES.map((v) => v.city))].sort((a, b) => a.localeCompare(b));
