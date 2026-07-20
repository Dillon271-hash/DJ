// Spotify's Web API, used server-side via the Client Credentials flow
// (app-only auth — no user login involved, just this app identifying
// itself with a client ID/secret to get a short-lived access token).
// Unlike Deezer's public search, Spotify's API is explicitly designed
// for exactly this kind of server-to-server use, so it shouldn't fight
// automated access the way Deezer's Akamai bot protection did. Requires
// SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to be set (see
// .env.example) — silently returns null if they're missing, same as
// any other "no image available" case.

let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiresAt) return cachedToken;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.access_token) return null;

    cachedToken = json.access_token;
    // Refresh a minute early so a request never lands right on expiry.
    cachedTokenExpiresAt = Date.now() + Math.max((json.expires_in ?? 3600) - 60, 30) * 1000;
    return cachedToken;
  } catch {
    return null;
  }
}

export async function lookupSpotifyImage(name) {
  const query = (name ?? "").trim();
  if (!query) return null;

  try {
    const token = await getAccessToken();
    if (!token) return null;

    const url = "https://api.spotify.com/v1/search?type=artist&limit=10&q=" + encodeURIComponent(query);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const json = await res.json();
    const items = Array.isArray(json?.artists?.items) ? json.artists.items : [];

    const q = query.toLowerCase();
    // Same policy as every other tier: only an exact (case-insensitive)
    // name match is trusted, so this can't resolve to a different artist
    // who happens to share a stage name. Ties broken by popularity.
    const exact = items
      .filter((a) => a?.name?.trim().toLowerCase() === q && Array.isArray(a.images) && a.images.length > 0)
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));

    return exact[0]?.images?.[0]?.url ?? null;
  } catch {
    return null;
  }
}
