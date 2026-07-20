import { lookupDeezerImage } from "./_lib/deezer.js";

// Vercel Node.js serverless function: GET /api/artist-image?name=...
// Only used as a last-resort fallback, after the client has already
// tried Wikipedia/Wikidata directly (those are properly CORS-enabled,
// no proxy needed). Same-origin, so the browser has no CORS objection.
export default async function handler(req, res) {
  const name = typeof req.query?.name === "string" ? req.query.name : "";
  const image = await lookupDeezerImage(name);

  // Cache successful and empty results for a day — artist photos don't
  // change often, and this keeps repeat lookups off Deezer's API.
  res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
  res.status(200).json({ image });
}
