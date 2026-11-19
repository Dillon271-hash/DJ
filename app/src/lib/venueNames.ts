import { bucketForScore, venueRatedLogs } from "./ranking";
import type { Bucket, SetLog } from "./types";

/** Venues are stored as one free-text string, usually "Name, City, ST"
 * when picked from the suggestions. Split it for display: the part before
 * the first comma is the venue, the rest is where it is. */
export function splitVenue(event: string): { name: string; place: string } {
  const i = event.indexOf(",");
  if (i < 0) return { name: event.trim(), place: "" };
  return { name: event.slice(0, i).trim(), place: event.slice(i + 1).trim() };
}

export function venueKey(event: string): string {
  return event.trim().toLowerCase();
}

export interface VenueCandidate {
  id: string;
  score: number;
  event: string;
}

/** One entry per distinct venue (not per visit), scored by its average
 * across rated visits — the same number the Venues tab ranks by. The
 * venue currently being rated is left out so it's never asked to be
 * compared against itself. */
export function venueCandidates(logs: SetLog[], bucket: Bucket, currentEvent: string): VenueCandidate[] {
  const current = venueKey(currentEvent);
  const byVenue = new Map<string, { event: string; scores: number[] }>();
  for (const log of venueRatedLogs(logs)) {
    const key = venueKey(log.event);
    if (key === current) continue;
    const entry = byVenue.get(key);
    if (entry) entry.scores.push(log.venueScore);
    else byVenue.set(key, { event: log.event, scores: [log.venueScore] });
  }
  const out: VenueCandidate[] = [];
  for (const [key, v] of byVenue) {
    const avg = v.scores.reduce((a, b) => a + b, 0) / v.scores.length;
    if (bucketForScore(avg) === bucket) out.push({ id: key, score: Math.round(avg * 10) / 10, event: v.event });
  }
  return out;
}
