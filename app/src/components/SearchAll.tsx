import { useMemo } from "react";
import { Link } from "react-router-dom";
import { SEED_ARTISTS } from "../lib/artists";
import { SEED_VENUES } from "../lib/venues";
import { taggedArtists, genresOf } from "../lib/genres";
import type { CommunityLog } from "../lib/recommend";
import { splitVenue } from "../lib/venueNames";
import { AvatarThumb } from "./AvatarThumb";
import { Doodle } from "./Doodle";

// Artist + venue search (Discover). Draws on the built-in lists plus
// everything anyone on Disko has logged.
export function SearchAll({ query, community }: { query: string; community: CommunityLog[] | null }) {
  const q = query.trim().toLowerCase();

  const { artists, venues } = useMemo(() => {
    const artistCounts = new Map<string, { name: string; n: number }>();
    const add = (name: string, n = 0) => {
      const k = name.trim().toLowerCase();
      if (!k) return;
      const e = artistCounts.get(k) ?? { name: name.trim(), n: 0 };
      e.n += n;
      artistCounts.set(k, e);
    };
    for (const a of SEED_ARTISTS) add(a);
    for (const a of taggedArtists()) add(a);
    const venueCounts = new Map<string, { event: string; name: string; place: string; kind?: string; n: number }>();
    const addVenue = (event: string, kind?: string, n = 0) => {
      const { name, place } = splitVenue(event);
      const k = name.trim().toLowerCase();
      if (!k) return;
      const e = venueCounts.get(k) ?? { event, name, place, kind, n: 0 };
      e.n += n;
      venueCounts.set(k, e);
    };
    for (const v of SEED_VENUES) addVenue(`${v.name}, ${v.city}`, v.kind);
    for (const c of community ?? []) {
      add(c.artist, 1);
      if (c.event) addVenue(c.event, undefined, 1);
    }
    return { artists: [...artistCounts.values()], venues: [...venueCounts.values()] };
  }, [community]);

  const rank = (name: string) => {
    const n = name.toLowerCase();
    if (n === q) return 0;
    if (n.startsWith(q)) return 1;
    if (n.split(/\s+/).some((w) => w.startsWith(q))) return 2;
    return n.includes(q) ? 3 : 9;
  };

  const artistHits = artists
    .map((a) => ({ ...a, r: rank(a.name) }))
    .filter((a) => a.r < 9)
    .sort((a, b) => a.r - b.r || b.n - a.n || a.name.localeCompare(b.name))
    .slice(0, 8);
  const venueHits = venues
    .map((v) => ({ ...v, r: Math.min(rank(v.name), rank(v.place) + 1) }))
    .filter((v) => v.r < 9)
    .sort((a, b) => a.r - b.r || b.n - a.n || a.name.localeCompare(b.name))
    .slice(0, 8);

  if (!q) return null;

  return (
    <div className="search-results">
      {artistHits.length === 0 && venueHits.length === 0 && <p className="hint">Nothing called “{query.trim()}” yet.</p>}
      {artistHits.length > 0 && (
        <section>
          <div className="section-label">Artists</div>
          {artistHits.map((a) => (
            <Link key={a.name} to={`/artist/${encodeURIComponent(a.name)}`} className="rank-row rank-row-standalone">
              <AvatarThumb name={a.name} />
              <div className="info">
                <div className="who">{a.name}</div>
                <div className="meta">
                  {[genresOf(a.name).slice(0, 2).join(" · "), a.n ? `${a.n} rating${a.n === 1 ? "" : "s"} on Disko` : ""]
                    .filter(Boolean)
                    .join(" — ") || "Artist"}
                </div>
              </div>
              <span className="chevron" aria-hidden="true">›</span>
            </Link>
          ))}
        </section>
      )}
      {venueHits.length > 0 && (
        <section style={{ marginTop: "1.2rem" }}>
          <div className="section-label">Venues &amp; festivals</div>
          {venueHits.map((v) => (
            <Link key={v.name} to={`/venue/${encodeURIComponent(v.event)}`} className="rank-row rank-row-standalone">
              <Doodle kind={v.kind === "festival" ? "festival" : "venue"} />
              <div className="info">
                <div className="who">{v.name}</div>
                <div className="meta">
                  {[v.place, v.n ? `${v.n} rating${v.n === 1 ? "" : "s"} on Disko` : ""].filter(Boolean).join(" · ")}
                </div>
              </div>
              <span className="chevron" aria-hidden="true">›</span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
