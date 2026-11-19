import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { SEED_VENUES, type VenueKind } from "../lib/venues";
import { splitVenue, venueKey } from "../lib/venueNames";
import { useEncoreStore } from "../lib/store";

type Filter = "all" | VenueKind;

interface Row {
  event: string;
  name: string;
  place: string;
  kind?: VenueKind;
  visits?: number;
  custom?: boolean;
}

function toEvent(name: string, city: string): string {
  return city ? `${name}, ${city}` : name;
}

/** Rank a row against the search text: name starts with it, then a word
 * in the name starts with it, then anywhere in the name, then the city. */
function matchRank(row: Row, q: string): number {
  const name = row.name.toLowerCase();
  if (name.startsWith(q)) return 0;
  if (name.split(/[\s\-/(]+/).some((w) => w.startsWith(q))) return 1;
  if (name.includes(q)) return 2;
  if (row.place.toLowerCase().includes(q)) return 3;
  return -1;
}

/** Full-height venue list for the "Where & when" step: everything shows
 * immediately — your own venues first, then every festival and club —
 * with tabs to narrow by kind and search to jump straight to one.
 * Anything not listed can still be typed in and used as-is. */
export function VenuePicker({ onSelect }: { onSelect: (event: string) => void }) {
  const logs = useEncoreStore((s) => s.logs);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const yours = useMemo<Row[]>(() => {
    const byVenue = new Map<string, Row & { last: number }>();
    for (const log of logs) {
      const key = venueKey(log.event);
      const existing = byVenue.get(key);
      if (existing) {
        existing.visits = (existing.visits ?? 0) + 1;
        existing.last = Math.max(existing.last, log.createdAt);
      } else {
        const { name, place } = splitVenue(log.event);
        const seed = SEED_VENUES.find((v) => v.name.toLowerCase() === name.toLowerCase());
        byVenue.set(key, { event: log.event, name, place, kind: seed?.kind, visits: 1, last: log.createdAt });
      }
    }
    return [...byVenue.values()].sort((a, b) => b.last - a.last);
  }, [logs]);

  const seeds = useMemo<Row[]>(() => {
    const known = new Set(yours.map((r) => venueKey(r.event)));
    return SEED_VENUES.filter((v) => !known.has(venueKey(toEvent(v.name, v.city)))).map((v) => ({
      event: toEvent(v.name, v.city),
      name: v.name,
      place: v.city,
      kind: v.kind,
    }));
  }, [yours]);

  const q = query.trim().toLowerCase();
  const sections = useMemo(() => {
    const byKind = (r: Row) => filter === "all" || r.kind === filter;
    if (!q) {
      return [
        { title: "Your venues", rows: yours.filter(byKind).slice(0, 8) },
        { title: filter === "festival" ? "Festivals" : filter === "club" ? "Clubs" : "Festivals & clubs", rows: seeds.filter(byKind) },
      ].filter((s) => s.rows.length > 0);
    }
    const ranked = [...yours, ...seeds]
      .filter(byKind)
      .map((row, i) => ({ row, i, rank: matchRank(row, q) }))
      .filter((r) => r.rank >= 0)
      .sort((a, b) => a.rank - b.rank || a.i - b.i)
      .slice(0, 60)
      .map((r) => r.row);
    const exact = ranked.some((r) => r.name.toLowerCase() === q || r.event.toLowerCase() === q);
    const custom: Row[] = exact ? [] : [{ event: query.trim(), name: query.trim(), place: "Use this name", custom: true }];
    return [{ title: ranked.length ? "Matches" : "", rows: [...custom, ...ranked] }];
  }, [q, query, filter, yours, seeds]);

  const flat = sections.flatMap((s) => s.rows);

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.max(0, Math.min(flat.length - 1, active + (e.key === "ArrowDown" ? 1 : -1)));
      setActive(next);
      listRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = flat[active];
      if (row) onSelect(row.event);
    }
  }

  let index = -1;
  return (
    <div className="venue-picker">
      <div className="search-field">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search clubs, festivals, cities"
          aria-label="Search venues"
          autoComplete="off"
          autoFocus
        />
      </div>

      <div className="chip-row venue-filter">
        {(["all", "festival", "club"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`chip ${filter === f ? "active" : ""}`}
            onClick={() => {
              setFilter(f);
              setActive(0);
            }}
          >
            {f === "all" ? "All" : f === "festival" ? "Festivals" : "Clubs"}
          </button>
        ))}
      </div>

      <ul className="venue-list" ref={listRef} role="listbox" aria-label="Venues">
        {sections.map((section) => (
          <li key={section.title || "results"} className="venue-section">
            {section.title && <div className="eyebrow venue-section-title">{section.title}</div>}
            <ul>
              {section.rows.map((row) => {
                index += 1;
                const i = index;
                return (
                  <li key={`${row.custom ? "custom:" : ""}${row.event}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === active}
                      data-index={i}
                      className={`venue-row ${i === active ? "active" : ""}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => onSelect(row.event)}
                    >
                      <span className={`venue-glyph ${row.custom ? "custom" : (row.kind ?? "club")}`} aria-hidden="true">
                        {row.custom ? "+" : row.kind === "festival" ? "✦" : "●"}
                      </span>
                      <span className="venue-row-text">
                        <span className="venue-row-name">{row.custom ? `Use “${row.name}”` : row.name}</span>
                        <span className="venue-row-place">
                          {row.custom ? "Not listed — that's fine" : row.place}
                          {row.visits ? ` · ${row.visits} visit${row.visits === 1 ? "" : "s"}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
