import { genresOf, normalizeArtist } from "./genres";
import { splitVenue } from "./venueNames";
import type { CommunityLog } from "./recommend";
import type { SetLog } from "./types";

// The three numbers on an artist or venue page:
//   Disko score — every Disko user's ratings averaged together
//   For you     — what Disko thinks *you* would give it
//   Friends     — your plus-ones' and crewmates' average

export type Kind = "artist" | "venue";

export interface ScoreSummary {
  disko: { score: number; count: number } | null;
  forYou: { score: number; basis: string; yours: boolean } | null;
  friends: { score: number; count: number; names: string[] } | null;
}

export const venueKey = (event: string) => splitVenue(event).name.trim().toLowerCase();
const keyFor = (kind: Kind, artistOrEvent: string) => (kind === "artist" ? normalizeArtist(artistOrEvent) : venueKey(artistOrEvent));

interface Rating {
  userId: string;
  key: string;
  score: number;
}

function ratings(kind: Kind, logs: CommunityLog[]): Rating[] {
  const out: Rating[] = [];
  for (const l of logs) {
    if (kind === "artist") out.push({ userId: l.userId, key: normalizeArtist(l.artist), score: l.score });
    else if (l.event && typeof l.venueScore === "number") out.push({ userId: l.userId, key: venueKey(l.event), score: l.venueScore });
  }
  return out;
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const clamp = (x: number) => Math.min(10, Math.max(0, x));

/** Each user's average score per artist/venue. */
function byUser(rs: Rating[]): Map<string, Map<string, number>> {
  const acc = new Map<string, Map<string, number[]>>();
  for (const r of rs) {
    const u = acc.get(r.userId) ?? new Map<string, number[]>();
    u.set(r.key, [...(u.get(r.key) ?? []), r.score]);
    acc.set(r.userId, u);
  }
  return new Map([...acc].map(([u, m]) => [u, new Map([...m].map(([k, v]) => [k, avg(v)]))]));
}

export function scoreSummary({
  kind,
  target,
  community,
  mine,
  me,
  friends,
}: {
  kind: Kind;
  /** Artist name, or the venue's "Name, City" string. */
  target: string;
  community: CommunityLog[];
  mine: SetLog[];
  me: string;
  /** Plus-ones and crewmates: id → name. */
  friends: Map<string, string>;
}): ScoreSummary {
  const key = keyFor(kind, target);
  // My own logs come from the store (always complete); everyone else's
  // from the community sample.
  const myLogs: CommunityLog[] = mine.map((l) => ({ userId: me, artist: l.artist, score: l.score, event: l.event, venueScore: l.venueScore ?? null }));
  const all = [...community.filter((c) => c.userId !== me), ...myLogs];
  const rs = ratings(kind, all);
  const users = byUser(rs);

  // Disko score: every rating of it, averaged.
  const onTarget = rs.filter((r) => r.key === key);
  const disko = onTarget.length ? { score: avg(onTarget.map((r) => r.score)), count: onTarget.length } : null;

  // Friends score.
  const friendScores = [...users].filter(([u, m]) => friends.has(u) && m.has(key));
  const friendsScore = friendScores.length
    ? { score: avg(friendScores.map(([, m]) => m.get(key)!)), count: friendScores.length, names: friendScores.map(([u]) => friends.get(u)!) }
    : null;

  // For you.
  const mineMap = users.get(me) ?? new Map<string, number>();
  let forYou: ScoreSummary["forYou"] = null;
  if (mineMap.has(key)) {
    forYou = { score: mineMap.get(key)!, basis: "Your score", yours: true };
  } else if (mineMap.size > 0) {
    const myMean = avg([...mineMap.values()]);
    // 1. People with similar taste: how closely their scores match yours
    //    on things you've both rated; their score here, adjusted to your
    //    scale (mean-centred), weighted by that similarity.
    let num = 0;
    let den = 0;
    let people = 0;
    for (const [u, m] of users) {
      if (u === me || !m.has(key)) continue;
      const shared = [...mineMap.keys()].filter((k) => m.has(k));
      if (shared.length === 0) continue;
      const agreement = avg(shared.map((k) => 1 - Math.abs(mineMap.get(k)! - m.get(k)!) / 10));
      const weight = agreement ** 2 * Math.min(1, shared.length / 3);
      const theirMean = avg([...m.values()]);
      num += weight * (m.get(key)! - theirMean + myMean);
      den += weight;
      people++;
    }
    if (den > 0.05) {
      forYou = { score: clamp(num / den), basis: `From ${people} ${people === 1 ? "person" : "people"} with your taste`, yours: false };
    } else if (kind === "artist") {
      // 2. Your scores for artists with the same sound.
      const gs = genresOf(target);
      const related = [...mineMap].filter(([k]) => genresOf(k).some((g) => gs.includes(g)));
      if (related.length) {
        const top = gs.find((g) => related.some(([k]) => genresOf(k).includes(g)));
        const base = avg(related.map(([, v]) => v));
        forYou = {
          score: clamp(disko ? base * 0.7 + disko.score * 0.3 : base),
          basis: `From how you rate ${top ?? "this sound"}`,
          yours: false,
        };
      }
    }
    // 3. Everyone's average, nudged to how generous you are.
    if (!forYou && disko) {
      const everyoneMean = avg(rs.map((r) => r.score));
      forYou = { score: clamp(disko.score + (myMean - everyoneMean) * 0.5), basis: "From the Disko average", yours: false };
    }
  }

  return { disko, forYou, friends: friendsScore };
}
