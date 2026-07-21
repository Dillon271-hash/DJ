import { useEffect, useRef, useState } from "react";

interface VenueResult {
  name: string;
  city: string;
}

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
  const [results, setResults] = useState<VenueResult[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const query = value.trim();
    if (!query) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const thisRequest = ++requestId.current;
      try {
        const res = await fetch(`/api/venue-search?q=${encodeURIComponent(query)}`);
        if (!res.ok) return;
        const json = await res.json();
        if (thisRequest !== requestId.current) return; // a newer keystroke superseded this
        setResults(Array.isArray(json?.results) ? json.results : []);
      } catch {
        if (thisRequest === requestId.current) setResults([]);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  function select(result: VenueResult) {
    onChange(result.city ? `${result.name}, ${result.city}` : result.name);
    setResults([]);
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
