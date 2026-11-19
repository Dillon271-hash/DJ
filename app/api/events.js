import { lookupEvents } from "./_lib/events.js";

// Vercel Node.js serverless function:
//   GET /api/events?place=Miami,%20FL   or   /api/events?lat=..&lng=..
// Upcoming dance/electronic shows near a place (see _lib/events.js).
export default async function handler(req, res) {
  const q = req.query ?? {};
  const result = await lookupEvents({
    place: typeof q.place === "string" ? q.place.slice(0, 120) : "",
    lat: typeof q.lat === "string" ? q.lat : undefined,
    lng: typeof q.lng === "string" ? q.lng : undefined,
  });
  // Listings change slowly — cache at the edge for 30 minutes.
  res.setHeader("Cache-Control", "public, max-age=600, s-maxage=1800");
  res.status(200).json(result);
}
