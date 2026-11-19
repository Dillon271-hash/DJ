import { lookupSpotifyImage } from "./_lib/spotify.js";

// Vercel Node.js serverless function: GET /api/artist-image?name=...
// The client's first tier for artist photos (Wikipedia/Wikidata are the
// fallback — see src/lib/artistImage.ts). Same-origin, so the browser
// has no CORS objection, and the Spotify secret stays server-side.
export default async function handler(req, res) {
  const name = typeof req.query?.name === "string" ? req.query.name : "";
  const image = await lookupSpotifyImage(name);

  // Cache successful and empty results for a day — artist photos don't
  // change often, and this keeps repeat lookups off Spotify's API.
  res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
  res.status(200).json({ image });
}
