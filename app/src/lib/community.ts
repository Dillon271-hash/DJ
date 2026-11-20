import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { rowToLog, useEncoreStore, type LogRow } from "./store";
import { namesFor, useSocial } from "./social";
import { splitVenue } from "./venueNames";
import type { FeedItem } from "./social";
import { fetchCommunityLogs } from "./discover";
import { scoreSummary, type ScoreSummary } from "./predict";
import type { CommunityLog } from "./recommend";

// Everyone's sets for one artist or one venue (for the artist/venue pages).

const clean = (s: string) => s.replace(/[\\%_"]/g, "");

async function withNames(rows: LogRow[]): Promise<FeedItem[]> {
  const names = await namesFor([...new Set(rows.map((r) => r.user_id!).filter(Boolean))]).catch(() => new Map<string, string>());
  return rows.map((row) => ({ log: rowToLog(row), person: { id: row.user_id!, name: names.get(row.user_id!) ?? "Disko user" } }));
}

export async function fetchArtistSets(artist: string): Promise<FeedItem[]> {
  if (!supabase || !artist.trim()) return [];
  const { data, error } = await supabase
    .from("logs")
    .select("*")
    .ilike("artist", clean(artist.trim()))
    .order("score", { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return withNames(data as LogRow[]);
}

/** Matches "Name" and "Name, anywhere" so the same club logged with or
 * without its city counts as one venue. */
export async function fetchVenueSets(venue: string): Promise<FeedItem[]> {
  const name = clean(splitVenue(venue).name.trim());
  if (!supabase || !name) return [];
  const { data, error } = await supabase
    .from("logs")
    .select("*")
    .or(`event.ilike."${name}",event.ilike."${name},%"`)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return withNames(data as LogRow[]);
}

/** Your plus-ones and crewmates: id → name. */
export function useFriendMap(): Map<string, string> {
  const me = useEncoreStore((s) => s.session?.user.id ?? "");
  const plusOnes = useSocial((s) => s.plusOnes);
  const crews = useSocial((s) => s.crews);
  return useMemo(() => {
    const m = new Map<string, string>();
    for (const f of plusOnes?.friends ?? []) m.set(f.id, f.name);
    for (const c of crews?.mine ?? []) for (const p of c.members) if (p.id !== me) m.set(p.id, p.name);
    return m;
  }, [plusOnes, crews, me]);
}

/** Everyone's sets plus the three scores for an artist or venue page. */
export function useCommunityScores(kind: "artist" | "venue", target: string) {
  const me = useEncoreStore((s) => s.session?.user.id ?? "");
  const mine = useEncoreStore((s) => s.logs);
  const friends = useFriendMap();
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [community, setCommunity] = useState<CommunityLog[] | null>(null);

  useEffect(() => {
    let stale = false;
    setItems(null);
    (kind === "artist" ? fetchArtistSets(target) : fetchVenueSets(target)).then((r) => !stale && setItems(r));
    fetchCommunityLogs().then((r) => !stale && setCommunity(r));
    return () => {
      stale = true;
    };
  }, [kind, target]);

  const summary = useMemo<ScoreSummary | null>(() => {
    if (!community) return null;
    // The page's own query is complete for this artist/venue; fold it in
    // so the sample used for taste-matching never misses these ratings.
    const extra: CommunityLog[] = (items ?? []).map(({ log, person }) => ({
      userId: person.id,
      artist: log.artist,
      score: log.score,
      event: log.event,
      venueScore: log.venueScore ?? null,
    }));
    const seen = new Set<string>();
    const merged = [...extra, ...community].filter((c) => {
      const k = `${c.userId}|${c.artist}|${c.event}|${c.score}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return scoreSummary({ kind, target, community: merged, mine, me, friends });
  }, [community, items, kind, target, mine, me, friends]);

  return { items, summary, loading: community === null || items === null };
}
