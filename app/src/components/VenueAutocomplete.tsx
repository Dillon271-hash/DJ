import { useMemo, useRef, useState } from "react";
import { SEED_VENUES } from "../lib/venues";

export function VenueAutocomplete({
  id,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const results = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return SEED_VENUES.filter(
      (v) => v.name.toLowerCase().includes(q) || v.city.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [value]);

  function select(result: { name: string; city: string }) {
    onChange(result.city ? `${result.name}, ${result.city}` : result.name);
    setOpen(false);
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
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimeout.current = setTimeout(() => setOpen(false), 120);
        }}
        required
      />
      {open && results.length > 0 && (
        <ul className="autocomplete-list" role="listbox">
          {results.map((r, i) => (
            <li key={`${r.name}-${r.city}-${i}`}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (blurTimeout.current) clearTimeout(blurTimeout.current);
                  select(r);
                }}
              >
                {r.name}
                {r.city && <span className="venue-city"> — {r.city}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
