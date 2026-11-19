import { create } from "zustand";
import { supabase } from "./supabase";
import { rowToLog, useEncoreStore, type LogRow } from "./store";
import type { SetLog } from "./types";

// Everything social: other people's rankings, plus-ones (friends), crews
// (groups) and the Charts. Relies on the tables/views/policies in
// supabase/schema.sql — if that hasn't been re-run, calls throw
// SocialSetupError so pages can say what to do.

export interface Mini {
  id: string;
  name: string;
}

export interface Person extends Mini {
  setCount: number;
  topArtist?: string;
  lastLoggedAt?: number;
}

export interface FeedItem {
  log: SetLog;
  person: Mini;
}

export interface PlusOnes {
  friends: Mini[];
  incoming: Mini[];
  outgoing: Mini[];
}

export type PlusOneState = "none" | "outgoing" | "incoming" | "friends";

export interface CrewSummary {
  id: string;
  name: string;
  color: number;
  memberCount: number;
  spins: number;
  members: Mini[];
}

export interface CrewInvite {
  crewId: string;
  name: string;
  color: number;
  invitedBy?: string;
}

export interface BoardRow {
  id: string;
  name: string;
  spins: number;
  setCount?: number;
  memberCount?: number;
  color?: number;
}

export class SocialSetupError extends Error {}

function db() {
  if (!supabase) throw new Error("Supabase isn't configured.");
  return supabase;
}

function me(): string {
  const id = useEncoreStore.getState().session?.user.id;
  if (!id) throw new Error("Not signed in.");
  return id;
}

// Missing table/view/relationship = schema.sql not re-run yet.
const SETUP_CODES = new Set(["PGRST205", "PGRST200", "42P01", "42703"]);

function check<T>(error: { code?: string; message: string } | null, data: T | null): T {
  if (error) {
    if (error.code && SETUP_CODES.has(error.code)) throw new SocialSetupError(error.message);
    throw new Error(error.message);
  }
  return data as T;
}

type NameRow = { display_name: string } | null;
const nameOf = (p: NameRow | NameRow[] | undefined) => (Array.isArray(p) ? p[0] : p)?.display_name ?? "Disko user";

// ---------------------------------------------------------------- people

const peopleCache = new Map<string, Promise<Person[]>>();

/** Everyone on Disko except me, most active first. */
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
  promise.catch(() => peopleCache.delete(meId));
  setTimeout(() => peopleCache.delete(meId), 60_000);
  return promise;
}

async function namesFor(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await db().from("profiles").select("id, display_name").in("id", ids);
  const rows = check(error, data) as { id: string; display_name: string }[];
  return new Map(rows.map((r) => [r.id, r.display_name]));
}

/** Latest sets — from everyone but me, or just from the given people. */
export async function fetchFeed(meId: string, opts: { userIds?: string[]; limit?: number } = {}): Promise<FeedItem[]> {
  if (opts.userIds && opts.userIds.length === 0) return [];
  let q = db().from("logs").select("*");
  q = opts.userIds ? q.in("user_id", opts.userIds) : q.neq("user_id", meId);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(opts.limit ?? 30);
  const rows = check(error, data) as LogRow[];
  const names = await namesFor([...new Set(rows.map((r) => r.user_id!).filter(Boolean))]);
  return rows.map((row) => ({
    log: rowToLog(row),
    person: { id: row.user_id!, name: names.get(row.user_id!) ?? "Disko user" },
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
): Promise<{ log: SetLog; owner: Mini; ownerLogs: SetLog[] } | null> {
  const { data, error } = await db().from("logs").select("user_id").eq("id", logId).maybeSingle();
  const row = check(error, data) as { user_id: string } | null;
  if (!row) return null;
  const rankings = await fetchUserRankings(row.user_id);
  const log = rankings?.logs.find((l) => l.id === logId);
  if (!rankings || !log) return null;
  return { log, owner: { id: row.user_id, name: rankings.name }, ownerLogs: rankings.logs };
}

// --------------------------------------------------------------- plus-ones

async function loadPlusOnes(meId: string): Promise<PlusOnes> {
  const { data, error } = await db()
    .from("friendships")
    .select(
      "requester, addressee, status, req:profiles!friendships_requester_fkey(display_name), addr:profiles!friendships_addressee_fkey(display_name)",
    );
  const rows = check(error, data) as unknown as {
    requester: string;
    addressee: string;
    status: "pending" | "accepted";
    req: NameRow;
    addr: NameRow;
  }[];
  const out: PlusOnes = { friends: [], incoming: [], outgoing: [] };
  for (const r of Array.isArray(rows) ? rows : []) {
    const mine = r.requester === meId;
    const other: Mini = mine ? { id: r.addressee, name: nameOf(r.addr) } : { id: r.requester, name: nameOf(r.req) };
    if (r.status === "accepted") out.friends.push(other);
    else (mine ? out.outgoing : out.incoming).push(other);
  }
  out.friends.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

// ------------------------------------------------------------------ crews

async function loadMyCrews(meId: string): Promise<{ mine: CrewSummary[]; invites: CrewInvite[] }> {
  const { data, error } = await db()
    .from("crew_members")
    .select("status, crew:crews(id, name, color), inviter:profiles!crew_members_invited_by_fkey(display_name)")
    .eq("user_id", meId);
  const rows = check(error, data) as unknown as {
    status: "invited" | "member";
    crew: { id: string; name: string; color: number } | null;
    inviter: NameRow;
  }[];
  const invites: CrewInvite[] = rows
    .filter((r) => r.status === "invited" && r.crew)
    .map((r) => ({ crewId: r.crew!.id, name: r.crew!.name, color: r.crew!.color, invitedBy: r.inviter ? nameOf(r.inviter) : undefined }));
  const crews = rows.filter((r) => r.status === "member" && r.crew).map((r) => r.crew!);
  return { mine: await summarize(crews), invites };
}

async function summarize(crews: { id: string; name: string; color: number }[]): Promise<CrewSummary[]> {
  if (crews.length === 0) return [];
  const ids = crews.map((c) => c.id);
  const [board, members] = await Promise.all([
    db().from("crew_board").select("crew_id, spins, member_count").in("crew_id", ids),
    db()
      .from("crew_members")
      .select("crew_id, user_id, who:profiles!crew_members_user_id_fkey(display_name)")
      .in("crew_id", ids)
      .eq("status", "member"),
  ]);
  const boardRows = check(board.error, board.data) as { crew_id: string; spins: number; member_count: number }[];
  const memberRows = check(members.error, members.data) as unknown as { crew_id: string; user_id: string; who: NameRow }[];
  return crews
    .map((c) => {
      const b = boardRows.find((r) => r.crew_id === c.id);
      return {
        ...c,
        spins: b?.spins ?? 0,
        memberCount: b?.member_count ?? 0,
        members: memberRows.filter((m) => m.crew_id === c.id).map((m) => ({ id: m.user_id, name: nameOf(m.who) })),
      };
    })
    .sort((a, b) => b.spins - a.spins);
}

export interface CrewDetail extends CrewSummary {
  createdBy: string;
  invited: Mini[];
  logs: (SetLog & { userId: string })[];
  rank: number | null;
}

export async function fetchCrew(crewId: string): Promise<CrewDetail | null> {
  const [crewRes, membersRes] = await Promise.all([
    db().from("crews").select("id, name, color, created_by").eq("id", crewId).maybeSingle(),
    db()
      .from("crew_members")
      .select("user_id, status, who:profiles!crew_members_user_id_fkey(display_name)")
      .eq("crew_id", crewId),
  ]);
  const crew = check(crewRes.error, crewRes.data) as { id: string; name: string; color: number; created_by: string } | null;
  if (!crew) return null;
  const memberRows = check(membersRes.error, membersRes.data) as unknown as {
    user_id: string;
    status: "invited" | "member";
    who: NameRow;
  }[];
  const members = memberRows.filter((m) => m.status === "member").map((m) => ({ id: m.user_id, name: nameOf(m.who) }));
  const invited = memberRows.filter((m) => m.status === "invited").map((m) => ({ id: m.user_id, name: nameOf(m.who) }));

  const [logsRes, boardRes] = await Promise.all([
    members.length
      ? db().from("logs").select("*").in("user_id", members.map((m) => m.id)).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    db().from("crew_board").select("crew_id, spins").order("spins", { ascending: false }).limit(500),
  ]);
  const logs = (check(logsRes.error, logsRes.data) as LogRow[]).map(rowToLog) as (SetLog & { userId: string })[];
  const board = check(boardRes.error, boardRes.data) as { crew_id: string; spins: number }[];
  const idx = board.findIndex((b) => b.crew_id === crewId);
  return {
    id: crew.id,
    name: crew.name,
    color: crew.color,
    createdBy: crew.created_by,
    members,
    invited,
    memberCount: members.length,
    spins: idx >= 0 ? board[idx].spins : 0,
    rank: idx >= 0 ? idx + 1 : null,
    logs,
  };
}

export async function createCrew(name: string, color: number, inviteIds: string[]): Promise<string> {
  const meId = me();
  const { data, error } = await db().from("crews").insert({ name: name.trim(), color }).select("id").single();
  const crew = check(error, data) as { id: string };
  const join = await db().from("crew_members").insert({ crew_id: crew.id, user_id: meId, status: "member" });
  check(join.error, null);
  if (inviteIds.length) await inviteToCrew(crew.id, inviteIds);
  await useSocial.getState().refresh();
  return crew.id;
}

export async function inviteToCrew(crewId: string, userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;
  const { error } = await db()
    .from("crew_members")
    .upsert(
      userIds.map((user_id) => ({ crew_id: crewId, user_id, status: "invited" })),
      { onConflict: "crew_id,user_id", ignoreDuplicates: true },
    );
  check(error, null);
}

export async function leaveCrew(crewId: string): Promise<void> {
  const { error } = await db().from("crew_members").delete().eq("crew_id", crewId).eq("user_id", me());
  check(error, null);
  await useSocial.getState().refresh();
}

// ----------------------------------------------------------------- charts

export async function fetchSoloBoard(): Promise<BoardRow[]> {
  const { data, error } = await db()
    .from("spins_board")
    .select("user_id, display_name, spins, set_count")
    .gt("spins", 0)
    .order("spins", { ascending: false })
    .limit(100);
  const rows = check(error, data) as { user_id: string; display_name: string; spins: number; set_count: number }[];
  return rows.map((r) => ({ id: r.user_id, name: r.display_name, spins: r.spins, setCount: r.set_count }));
}

export async function fetchCrewBoard(): Promise<BoardRow[]> {
  const { data, error } = await db()
    .from("crew_board")
    .select("crew_id, name, color, spins, member_count")
    .gt("member_count", 0)
    .order("spins", { ascending: false })
    .limit(100);
  const rows = check(error, data) as { crew_id: string; name: string; color: number; spins: number; member_count: number }[];
  return rows.map((r) => ({ id: r.crew_id, name: r.name, color: r.color, spins: r.spins, memberCount: r.member_count }));
}

// ------------------------------------------------------- shared social state

// Plus-ones and crews are needed all over (People, profiles, the nav's
// request badge, crew invites), so they live in one small store that's
// loaded once after sign-in and updated in place by every action.
interface SocialState {
  plusOnes: PlusOnes | null;
  crews: { mine: CrewSummary[]; invites: CrewInvite[] } | null;
  setupNeeded: boolean;
  refresh: () => Promise<void>;
  stateWith: (id: string) => PlusOneState;
  addPlusOne: (person: Mini) => Promise<void>;
  acceptPlusOne: (person: Mini) => Promise<void>;
  removePlusOne: (id: string) => Promise<void>;
  acceptCrewInvite: (crewId: string) => Promise<void>;
  declineCrewInvite: (crewId: string) => Promise<void>;
}

export const useSocial = create<SocialState>()((set, get) => ({
  plusOnes: null,
  crews: null,
  setupNeeded: false,

  refresh: async () => {
    const meId = useEncoreStore.getState().session?.user.id;
    if (!meId) return;
    try {
      const [plusOnes, crews] = await Promise.all([loadPlusOnes(meId), loadMyCrews(meId)]);
      set({ plusOnes, crews, setupNeeded: false });
    } catch (e) {
      console.error("[social] load failed:", e);
      set({
        setupNeeded: e instanceof SocialSetupError,
        plusOnes: get().plusOnes ?? { friends: [], incoming: [], outgoing: [] },
        crews: get().crews ?? { mine: [], invites: [] },
      });
    }
  },

  stateWith: (id) => {
    const p = get().plusOnes;
    if (!p) return "none";
    if (p.friends.some((f) => f.id === id)) return "friends";
    if (p.incoming.some((f) => f.id === id)) return "incoming";
    if (p.outgoing.some((f) => f.id === id)) return "outgoing";
    return "none";
  },

  addPlusOne: async (person) => {
    // They already asked me — adding them back just accepts.
    if (get().stateWith(person.id) === "incoming") return get().acceptPlusOne(person);
    const { error } = await db().from("friendships").insert({ addressee: person.id });
    check(error, null);
    const p = get().plusOnes!;
    set({ plusOnes: { ...p, outgoing: [...p.outgoing, person] } });
  },

  acceptPlusOne: async (person) => {
    const { error } = await db()
      .from("friendships")
      .update({ status: "accepted" })
      .eq("requester", person.id)
      .eq("addressee", me());
    check(error, null);
    const p = get().plusOnes!;
    set({
      plusOnes: {
        ...p,
        incoming: p.incoming.filter((x) => x.id !== person.id),
        friends: [...p.friends, person].sort((a, b) => a.name.localeCompare(b.name)),
      },
    });
  },

  removePlusOne: async (id) => {
    const meId = me();
    const { error } = await db()
      .from("friendships")
      .delete()
      .or(`and(requester.eq.${meId},addressee.eq.${id}),and(requester.eq.${id},addressee.eq.${meId})`);
    check(error, null);
    const p = get().plusOnes!;
    const drop = (list: Mini[]) => list.filter((x) => x.id !== id);
    set({ plusOnes: { friends: drop(p.friends), incoming: drop(p.incoming), outgoing: drop(p.outgoing) } });
  },

  acceptCrewInvite: async (crewId) => {
    const { error } = await db().from("crew_members").update({ status: "member" }).eq("crew_id", crewId).eq("user_id", me());
    check(error, null);
    await get().refresh();
  },

  declineCrewInvite: async (crewId) => {
    const { error } = await db().from("crew_members").delete().eq("crew_id", crewId).eq("user_id", me());
    check(error, null);
    const c = get().crews!;
    set({ crews: { ...c, invites: c.invites.filter((i) => i.crewId !== crewId) } });
  },
}));

// Load once a session exists; clear on sign-out.
let lastUser: string | undefined;
useEncoreStore.subscribe((s) => {
  const id = s.session?.user.id;
  if (id === lastUser) return;
  lastUser = id;
  if (id) useSocial.getState().refresh();
  else useSocial.setState({ plusOnes: null, crews: null });
});
const initial = useEncoreStore.getState().session?.user.id;
if (initial) {
  lastUser = initial;
  useSocial.getState().refresh();
}

export const CREW_COLORS: [string, string][] = [
  ["#ff3d22", "#ffb13b"],
  ["#ff1f7a", "#ffb13b"],
  ["#6a2ce0", "#ff1f7a"],
  ["#1f8a70", "#7ad3a8"],
  ["#2457d6", "#59b7ff"],
  ["#111111", "#8b8779"],
];
