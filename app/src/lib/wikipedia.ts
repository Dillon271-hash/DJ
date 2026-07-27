// Shared "find the right Wikipedia page for this artist" lookup, used by
// both the photo fallback (artistImage.ts) and the bio lookup
// (artistBio.ts). The safety rules matter equally for both — an exact
// name match only, reject anything that isn't clearly a person's bio
// page — but getting it wrong is worse for a bio than a photo: a wrong
// photo is just an odd thumbnail, a wrong bio is someone else's life
// story confidently attached to this artist's name.

export interface WikiSummary {
  extract?: string;
  description?: string;
  originalimage?: { source: string };
  thumbnail?: { source: string };
  wikibase_item?: string;
  type?: string;
}

const NON_BIO_TITLE = /:|discography|\(album\)|\(ep\)|\(song\)|\(mixtape\)|\(film\)|\(tv series\)/i;

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
// getting back "Eddie Fisher," a 1950s singer). So this only trusts
// titles that normalize to the artist's *exact* name, allowing a
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

export async function findWikipediaSummary(query: string, signal?: AbortSignal): Promise<WikiSummary | null> {
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
      const summaryJson = (await summaryRes.json()) as WikiSummary;
      if (summaryJson?.type === "disambiguation") continue;
      if (!looksLikeMusicBio(summaryJson?.description)) continue;
      return summaryJson;
    }
    return null;
  } catch {
    return null;
  }
}
