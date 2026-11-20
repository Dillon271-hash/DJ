import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { CrewBadge } from "./CrewBadge";
import { Vinyl } from "./Vinyl";

// A crew record you can tap to choose its photo.
export function PhotoPickBadge({
  name,
  color,
  size,
  photoUrl,
  onPick,
  label,
  busy = false,
  spinning = false,
}: {
  name: string;
  color: number;
  size: number;
  photoUrl: string | null;
  onPick: (file: File) => void;
  label: string;
  busy?: boolean;
  spinning?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onPick(f);
  }
  return (
    <button
      type="button"
      className={`photo-pick-badge${spinning ? " spinning" : ""}`}
      onClick={() => input.current?.click()}
      disabled={busy}
      aria-label={label}
      title={label}
    >
      <CrewBadge name={name} color={color} size={size} photoUrl={photoUrl} />
      <span className="photo-pick-plus" aria-hidden="true">
        {busy ? (
          <Vinyl size={16} spin />
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        )}
      </span>
      <input ref={input} type="file" accept="image/*" onChange={onChange} hidden />
    </button>
  );
}

/** A temporary preview URL for a picked file (revoked when it changes). */
export function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}
