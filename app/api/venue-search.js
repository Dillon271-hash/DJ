import { searchVenues } from "./_lib/foursquare.js";

// Vercel Node.js serverless function: GET /api/venue-search?q=...
// Same-origin proxy, mirrors api/artist-image.js — Foursquare's API
// needs a key that can't safely live in client-side code.
export default async function handler(req, res) {
  const q = typeof req.query?.q === "string" ? req.query.q : "";
  const results = await searchVenues(q);

  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
  res.status(200).json({ results });
}
