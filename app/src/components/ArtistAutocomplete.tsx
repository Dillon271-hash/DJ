import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { SEED_ARTISTS } from "../lib/artists";

export function ArtistAutocomplete({
  id,
  value,
  onChange,
  recents,
  placeholder,
  autoFocus,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  recents: string[];
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pool = useMemo(() => {
    const seen = new Set<string>();
    const combined: string[] = [];
    for (const name of [...recents, ...SEED_ARTISTS]) {
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(name);
      }
    }
    return combined;
  }, [recents]);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    const matches = q ? pool.filter((name) => name.toLowerCase().includes(q)) : pool;
    return matches
      .filter((name) => name.toLowerCase() !== q)
      .slice(0, 6);
  }, [pool, value]);

  function select(name: string) {
    onChange(name);
    setOpen(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(suggestions[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="autocomplete">
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setHighlight(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimeout.current = setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={handleKeyDown}
        required
      />
      {open && suggestions.length > 0 && (
        <ul className="autocomplete-list" role="listbox">
          {suggestions.map((name, i) => (
            <li key={name}>
              <button
                type="button"
                className={i === highlight ? "highlighted" : ""}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (blurTimeout.current) clearTimeout(blurTimeout.current);
                  select(name);
                }}
                onMouseEnter={() => setHighlight(i)}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
