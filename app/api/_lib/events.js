// Upcoming dance/electronic shows near a city, from Ticketmaster's free
// Discovery API (developer.ticketmaster.com — the "Consumer Key" goes in
// TICKETMASTER_API_KEY). Server-side only so the key never reaches the
// browser. Returns { configured: false } when no key is set, so the app
// can simply leave the section out.

const DANCE_ELECTRONIC = "KnvZfZ7vAvF"; // Ticketmaster genre id
const MUSIC = "KZFzniwnSyZfZ7v7nJ"; // Ticketmaster segment id

const COUNTRY_CODES = {
  usa: "US", "united states": "US", us: "US", uk: "GB", "united kingdom": "GB", england: "GB", scotland: "GB",
  wales: "GB", ireland: "IE", canada: "CA", mexico: "MX", germany: "DE", france: "FR", spain: "ES", italy: "IT",
  netherlands: "NL", belgium: "BE", portugal: "PT", australia: "AU", "new zealand": "NZ", sweden: "SE",
  norway: "NO", denmark: "DK", finland: "FI", poland: "PL", austria: "AT", switzerland: "CH", brazil: "BR",
  "south africa": "ZA", japan: "JP", "czech republic": "CZ", turkey: "TR", "united arab emirates": "AE", uae: "AE",
};

/** "Miami, FL" → { city: Miami, stateCode: FL, countryCode: US }; "Berlin, Germany" → DE. */
export function parsePlace(place) {
  const parts = String(place || "").split(",").map((p) => p.trim()).filter(Boolean);
  const out = { city: parts[0] || "" };
  const rest = parts.slice(1);
  for (const p of rest) {
    if (/^[A-Z]{2}$/.test(p) && !COUNTRY_CODES[p.toLowerCase()]) {
      out.stateCode = p;
      out.countryCode ??= "US";
    } else if (COUNTRY_CODES[p.toLowerCase()]) {
      out.countryCode = COUNTRY_CODES[p.toLowerCase()];
    }
  }
  return out;
}

function bestImage(images) {
  if (!Array.isArray(images) || images.length === 0) return null;
  const wide = images.filter((i) => i.ratio === "16_9").sort((a, b) => b.width - a.width);
  const pick = wide.find((i) => i.width <= 1024) ?? wide[0] ?? images[0];
  return pick?.url ?? null;
}

export async function lookupEvents({ place, lat, lng }) {
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) return { configured: false, events: [] };

  const params = new URLSearchParams({
    apikey: key,
    segmentId: MUSIC,
    genreId: DANCE_ELECTRONIC,
    sort: "date,asc",
    size: "60",
    startDateTime: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  });
  if (lat && lng) {
    params.set("latlong", `${Number(lat).toFixed(3)},${Number(lng).toFixed(3)}`);
    params.set("radius", "40");
    params.set("unit", "miles");
  } else {
    const p = parsePlace(place);
    if (!p.city) return { configured: true, events: [] };
    params.set("city", p.city);
    if (p.stateCode) params.set("stateCode", p.stateCode);
    if (p.countryCode) params.set("countryCode", p.countryCode);
  }

  try {
    const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`);
    if (!res.ok) {
      console.error("[events] Ticketmaster responded", res.status);
      return { configured: true, events: [], error: true };
    }
    const json = await res.json();
    const seen = new Set();
    const events = (json?._embedded?.events ?? [])
      .map((e) => {
        const venue = e._embedded?.venues?.[0];
        return {
          id: e.id,
          name: e.name,
          url: e.url,
          date: e.dates?.start?.localDate ?? null,
          time: e.dates?.start?.timeTBA || e.dates?.start?.noSpecificTime ? null : (e.dates?.start?.localTime ?? null),
          venue: venue?.name ?? null,
          city: [venue?.city?.name, venue?.state?.stateCode ?? venue?.country?.name].filter(Boolean).join(", ") || null,
          image: bestImage(e.images),
          artists: (e._embedded?.attractions ?? []).map((a) => a.name).filter(Boolean),
        };
      })
      // Multi-day listings and ticket tiers often repeat — keep one per
      // name + date.
      .filter((e) => {
        const k = `${e.name}|${e.date}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    return { configured: true, events };
  } catch (err) {
    console.error("[events] lookup failed:", err);
    return { configured: true, events: [], error: true };
  }
}
