// Looks up a real photo for an artist via Wikipedia's public, keyless,
// CORS-enabled API. There's no image-search API we can call from a
// browser without a paid key and a backend to hide it behind, so this is
// the closest honest equivalent: search Wikipedia for the artist, then
// pull the lead image off their page. Callers should treat a null result
// (no page, no image, network error) as "show a fallback avatar," not
// as an error to surface.
export async function fetchArtistImage(name: string, signal?: AbortSignal): Promise<string | null> {
  const query = name.trim();
  if (!query) return null;

  try {
    const searchUrl =
      "https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=1&srsearch=" +
      encodeURIComponent(`${query} DJ`);
    const searchRes = await fetch(searchUrl, { signal });
    if (!searchRes.ok) return null;
    const searchJson = await searchRes.json();
    const title: string | undefined = searchJson?.query?.search?.[0]?.title;
    if (!title) return null;

    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const summaryRes = await fetch(summaryUrl, { signal });
    if (!summaryRes.ok) return null;
    const summaryJson = await summaryRes.json();

    return summaryJson?.originalimage?.source ?? summaryJson?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}
