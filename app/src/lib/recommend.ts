import { genresOf, normalizeArtist, taggedArtists, type Genre } from "./genres";
import type { SetLog } from "./types";

// "DJs you'd like": blends three signals, strongest reason wins the label.
//   1. Your plus-ones/crew rated them highly ("Alicia gave them 9.1")
//   2. People who loved what you loved also loved them ("Fans of Fisher
//      love them") — from every Disko user's ratings
//   3. Their sound matches what you score highly ("Because you loved
//      Fisher") — from the genre tags in genres.ts
// Artists you've already logged are never recommended.

export interface CommunityLog {
  userId: string;
  artist: string;
  score: number;
  event?: string;
  venueScore?: number | null;
}

export interface Rec {
  artist: string;
  reason: string;
  genres: Genre[];
  kind: "friend" | "crowd" | "sound" | "popular";
  points: number;
}

const LOVED = 7;

function averages(logs: { artist: string; score: number }[]) {
  const by = new Map<string, { name: string; total: number; n: number }>();
  for (const l of logs) {
    const k = normalizeArtist(l.artist);
    const e = by.get(k) ?? { name: l.artist.trim(), total: 0, n: 0 };
    e.total += l.score;
    e.n++;
    by.set(k, e);
  }
  return new Map([...by].map(([k, e]) => [k, { name: e.name, avg: e.total / e.n }]));
}

export function recommend({
  mine,
  community,
  me,
  friends = new Map(),
  limit = 12,
}: {
  mine: SetLog[];
  community: CommunityLog[];
  me: string;
  /** Plus-ones and crewmates: id → first name. */
  friends?: Map<string, string>;
  limit?: number;
}): Rec[] {
  const myAvg = averages(mine);
  const myLoved = [...myAvg].filter(([, v]) => v.avg >= LOVED);
  const others = community.filter((c) => c.userId !== me);

  type Acc = { name: string; points: number; reasons: { kind: Rec["kind"]; text: string; weight: number }[] };
  const acc = new Map<string, Acc>();
  const bump = (name: string, points: number, kind: Rec["kind"], text: string, weight: number) => {
    const k = normalizeArtist(name);
    if (myAvg.has(k)) return;
    const e = acc.get(k) ?? { name: name.trim(), points: 0, reasons: [] };
    e.points += points;
    e.reasons.push({ kind, text, weight });
    acc.set(k, e);
  };

  // 3. Sound — genre weights from your own scores (loved pulls a genre
  //    up, "not for me" pushes it down).
  const genreWeight = new Map<Genre, number>();
  for (const [k, v] of myAvg) {
    for (const g of genresOf(k)) genreWeight.set(g, (genreWeight.get(g) ?? 0) + (v.avg - 5.5));
  }
  if (genreWeight.size) {
    for (const artist of taggedArtists()) {
      const gs = genresOf(artist);
      const content = gs.reduce((s, g) => s + (genreWeight.get(g) ?? 0), 0) / Math.sqrt(gs.length);
      if (content <= 0) continue;
      // Name the loved artist it has most in common with.
      let anchor: { name: string; shared: number; avg: number } | null = null;
      for (const [lk, lv] of myLoved) {
        const shared = genresOf(lk).filter((g) => gs.includes(g)).length;
        if (shared && (!anchor || shared > anchor.shared || (shared === anchor.shared && lv.avg > anchor.avg))) {
          anchor = { name: lv.name, shared, avg: lv.avg };
        }
      }
      if (!anchor) continue;
      bump(artist, content * 0.6, "sound", `Because you loved ${anchor.name}`, 1);
    }
  }

  // 2 & 1. Other people's ratings.
  const byUser = new Map<string, CommunityLog[]>();
  for (const c of others) byUser.set(c.userId, [...(byUser.get(c.userId) ?? []), c]);
  const lovedKeys = new Set(myLoved.map(([k]) => k));
  const crowdCount = new Map<string, number>();
  for (const [userId, logs] of byUser) {
    const theirs = averages(logs);
    const overlap = [...theirs].filter(([k, v]) => v.avg >= LOVED && lovedKeys.has(k));
    const friendName = friends.get(userId);
    for (const [k, v] of theirs) {
      if (v.avg < LOVED) continue;
      if (friendName && v.avg >= 8) {
        bump(v.name, 3 + (v.avg - 8), "friend", `${friendName} gave them ${v.avg.toFixed(1)}`, 3);
      }
      if (overlap.length && !lovedKeys.has(k)) {
        const anchor = myAvg.get(overlap[0][0])!.name;
        bump(v.name, 1.5 * Math.min(3, overlap.length), "crowd", `Fans of ${anchor} love them`, 2);
      }
      crowdCount.set(k, (crowdCount.get(k) ?? 0) + 1);
    }
  }

  // Popular on Disko — a small nudge, and the whole answer for someone
  // who hasn't loved anything yet.
  for (const [k, n] of crowdCount) {
    const e = acc.get(k);
    if (e) e.points += Math.min(1.5, n * 0.3);
    else if (!myLoved.length) bump(others.find((o) => normalizeArtist(o.artist) === k)!.artist, n * 0.5, "popular", `Loved by ${n} on Disko`, 0);
  }

  let recs: Rec[] = [...acc.values()].map((e) => {
    const best = e.reasons.sort((a, b) => b.weight - a.weight)[0];
    return { artist: e.name, points: e.points, reason: best.text, kind: best.kind, genres: genresOf(e.name) };
  });

  // Brand new and nobody's logged anything yet: a spread of starter picks.
  if (recs.length === 0) {
    recs = STARTERS.filter((a) => !myAvg.has(normalizeArtist(a))).map((a, i) => ({
      artist: a,
      points: -i,
      reason: `A ${genresOf(a)[0] ?? "Disko"} essential`,
      kind: "popular" as const,
      genres: genresOf(a),
    }));
  }

  // Keep it varied: at most 3 picks share the same reason ("Because you
  // loved Carl Cox"), the rest wait until there's room.
  recs.sort((a, b) => b.points - a.points);
  const perReason = new Map<string, number>();
  const picked: Rec[] = [];
  const held: Rec[] = [];
  for (const r of recs) {
    const n = perReason.get(r.reason) ?? 0;
    if (n < 3) {
      picked.push(r);
      perReason.set(r.reason, n + 1);
    } else held.push(r);
  }
  return [...picked, ...held].slice(0, limit);
}

const STARTERS = [
  "Fred again..", "Peggy Gou", "Fisher", "Charlotte de Witte", "Black Coffee", "Four Tet", "Tale Of Us",
  "Fred again..", "Skrillex", "Andy C", "Purple Disco Machine", "Keinemusik", "Eric Prydz", "Sammy Virji",
].filter((a, i, all) => all.indexOf(a) === i);

/** Artists that sound most like this one (shared genres). */
export function similarArtists(artist: string, limit = 8): { artist: string; genres: Genre[] }[] {
  const mine = genresOf(artist);
  if (mine.length === 0) return [];
  const self = normalizeArtist(artist);
  return taggedArtists()
    .filter((a) => normalizeArtist(a) !== self)
    .map((a) => {
      const gs = genresOf(a);
      const shared = gs.filter((g) => mine.includes(g)).length;
      return { artist: a, genres: gs, sim: shared / (mine.length + gs.length - shared) };
    })
    .filter((x) => x.sim > 0)
    .sort((a, b) => b.sim - a.sim || a.artist.localeCompare(b.artist))
    .slice(0, limit);
}
