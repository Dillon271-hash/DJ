import { useState } from "react";
import { fetchEvents, KNOWN_CITIES, useCity } from "../lib/discover";
import { Sheet } from "./Sheet";

// Set or change your city (Discover's "near you" and the feed's ordering).
export function CitySheet({ current, onClose }: { current: string; onClose: () => void }) {
  const save = useCity((s) => s.save);
  const [value, setValue] = useState(current);
  const [locating, setLocating] = useState<"idle" | "busy" | "failed">("idle");
  const q = value.trim().toLowerCase();
  const suggestions = q ? KNOWN_CITIES.filter((c) => c.toLowerCase().includes(q)).slice(0, 8) : KNOWN_CITIES.slice(0, 0);

  async function pick(city: string) {
    await save(city);
    onClose();
  }

  // Your location is only used for this one lookup: whichever city the
  // nearest shows are in becomes your city. Coordinates aren't stored.
  function locate() {
    if (!navigator.geolocation) return setLocating("failed");
    setLocating("busy");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const r = await fetchEvents({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        const counts = new Map<string, number>();
        for (const e of r.events) if (e.city) counts.set(e.city, (counts.get(e.city) ?? 0) + 1);
        const best = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
        if (best) {
          setValue(best);
          setLocating("idle");
        } else setLocating("failed");
      },
      () => setLocating("failed"),
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }

  return (
    <Sheet onClose={onClose} label="Your city">
      <h2 className="display sheet-title">Your city</h2>
      <p className="hint" style={{ textAlign: "center", margin: "-0.4rem 0 1rem" }}>
        Used to show who's playing near you. Only the city is saved.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) pick(value);
        }}
      >
        <input
          className="text-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. Miami, FL or Berlin, Germany"
          autoFocus
          aria-label="City"
        />
        {suggestions.length > 0 && (
          <div className="invite-list">
            {suggestions.map((c) => (
              <button key={c} type="button" className="invite-pick" onClick={() => pick(c)}>
                <PinIcon />
                <span>{c}</span>
              </button>
            ))}
          </div>
        )}
        <button type="button" className="link-btn" onClick={locate} disabled={locating === "busy"}>
          {locating === "busy" ? "Finding you…" : locating === "failed" ? "Couldn't find your city — type it instead" : "Use my current location"}
        </button>
        <div className="sheet-actions">
          {current ? (
            <button type="button" className="ghost-btn" onClick={() => pick("")}>
              Clear
            </button>
          ) : (
            <button type="button" className="ghost-btn" onClick={onClose}>
              Cancel
            </button>
          )}
          <button type="submit" className="sticker-btn" disabled={!value.trim()}>
            Save city
          </button>
        </div>
      </form>
    </Sheet>
  );
}


export function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}
