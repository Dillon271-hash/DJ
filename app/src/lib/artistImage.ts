// Looks up a real photo for a new artist, trying three tiers in order:
//
// 1. Spotify's artist search — checked first because it's specifically a
//    profile picture (not just any editorial photo) and has far better
//    coverage of working club DJs than Wikipedia ever will. Spotify
//    requires authentication even for basic search, so this can't be
//    called directly from the browser (the app's client secret can't
//    safely live in client-side code) — routed through this app's own
//    /api/artist-image endpoint, which holds the credentials
//    server-side and does the Spotify auth + search there. Only live
//    when this app is running somewhere that serves it (Vercel in
//    production, `npm run dev` locally, both configured with
//    SPOTIFY_CLIENT_ID/SECRET — see .env.example); a plain static host
//    or the sandboxed Artifact demo just won't have that route.
// 2. Wikipedia's infobox thumbnail and 3. Wikidata's separate P18
//    ("image") claim for the same page, as a fallback for legacy/
//    crossover artists Spotify's search misses — both public, keyless,
//    and genuinely CORS-enabled, so they're called directly from the
//    browser regardless of whether the Spotify proxy is configured.
//
// Callers should treat a null result (no page, no image, no route,
// network error) as "show a fallback avatar," not as an error to surface.

const cache = new Map<string, string | null>();

export async function fetchArtistImage(name: string, signal?: AbortSignal): Promise<string | null> {
  const query = name.trim();
  if (!query) return null;

  const key = query.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;

  const result = (await lookupProxy(query, signal)) ?? (await lookupWikipedia(query, signal));
  // Only cache a settled result — never cache an in-flight abort as "no image."
  if (!signal?.aborted) cache.set(key, result);
  return result;
}

async function lookupProxy(query: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(`/api/artist-image?name=${encodeURIComponent(query)}`, { signal });
    if (!res.ok) return null;
    const json = await res.json();
    return typeof json?.image === "string" ? json.image : null;
  } catch {
    return null;
  }
}

const NON_BIO_TITLE = /:|discography|\(album\)|\(ep\)|\(song\)|\(mixtape\)|\(film\)|\(tv series\)/i;

async function lookupWikipedia(query: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const searchUrl =
      "https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=5&srsearch=" +
      encodeURIComponent(query);
    const searchRes = await fetch(searchUrl, { signal });
    if (!searchRes.ok) return null;
    const searchJson = await searchRes.json();
    const titles: string[] = (searchJson?.query?.search ?? []).map((r: { title: string }) => r.title);
    if (titles.length === 0) return null;

    for (const title of rankCandidates(query, titles)) {
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      const summaryRes = await fetch(summaryUrl, { signal });
      if (!summaryRes.ok) continue;
      const summaryJson = await summaryRes.json();
      if (summaryJson?.type === "disambiguation") continue;
      if (!looksLikeMusicBio(summaryJson?.description)) continue;

      const img = summaryJson?.originalimage?.source ?? summaryJson?.thumbnail?.source ?? null;
      if (img) return img;

      // Wikipedia's own infobox thumbnail is empty, but this is confirmed
      // to be the right page — Wikidata's P18 claim for the same item is
      // set independently and sometimes has a photo Wikipedia doesn't.
      const wikidataImg = await lookupWikidataImage(summaryJson?.wikibase_item, signal);
      if (wikidataImg) return wikidataImg;
    }
    return null;
  } catch {
    return null;
  }
}

async function lookupWikidataImage(qid: string | undefined, signal?: AbortSignal): Promise<string | null> {
  if (!qid) return null;
  try {
    const url = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${encodeURIComponent(qid)}&property=P18&format=json&origin=*`;
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const json = await res.json();
    const filename = json?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (!filename || typeof filename !== "string") return null;
    // Special:FilePath redirects to the actual Commons file — safe to
    // drop straight into an <img src>, no extra lookup needed.
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
  } catch {
    return null;
  }
}

// Guards against a title that happens to normalize to an exact name match
// but is a completely unrelated topic (e.g. "Fisher" the DJ vs. "Fisher"
// the animal). Wikipedia's REST summary includes a short Wikidata-derived
// description; if it's present and clearly not about a musician, skip the
// candidate. An absent description isn't evidence either way, so let it
// through rather than rejecting a page we simply can't verify.
const MUSIC_BIO_HINT =
  /\bdj\b|musician|producer|singer|rapper|composer|songwriter|\bband\b|\bduo\b|artist|entertainer|vocalist|remixer/i;

function looksLikeMusicBio(description: string | undefined): boolean {
  if (!description) return true;
  return MUSIC_BIO_HINT.test(description);
}

// Wikipedia's free-text search ranks by relevance, not "is this a person's
// bio page" — a same-named album, single, or compilation often outranks
// the artist's own article, and a fuzzy/substring match can land on a
// completely different real person (e.g. querying "Fisher" the DJ and
// getting back "Eddie Fisher," a 1950s singer — a confidently wrong photo
// under the right name, which is worse than no photo). So this only
// trusts titles that normalize to the artist's *exact* name, allowing a
// trailing qualifier like "(musician)," and skips anything that looks
// like a release/media page rather than a biography.
function rankCandidates(query: string, titles: string[]): string[] {
  const q = query.trim().toLowerCase();
  const normalize = (t: string) =>
    t
      .replace(/\s*\([^)]*\)\s*$/, "")
      .trim()
      .toLowerCase();

  return titles.filter((t) => !NON_BIO_TITLE.test(t) && normalize(t) === q).slice(0, 3);
}
