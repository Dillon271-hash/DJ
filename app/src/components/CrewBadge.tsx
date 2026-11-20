import { useState, type CSSProperties } from "react";
import { CREW_COLORS } from "../lib/social";

// A crew's badge: a record whose label is the crew's photo — or, without
// one, the crew's colours with their initials.
export function CrewBadge({
  name,
  color,
  size = 48,
  photoUrl,
}: {
  name: string;
  color: number;
  size?: number;
  photoUrl?: string | null;
}) {
  const [a, b] = CREW_COLORS[color % CREW_COLORS.length] ?? CREW_COLORS[0];
  const [broken, setBroken] = useState<string | null>(null);
  const showPhoto = photoUrl && broken !== photoUrl;
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
  return (
    <span
      className={`crew-badge${showPhoto ? " has-photo" : ""}`}
      style={{ "--size": `${size}px`, "--a": a, "--b": b } as CSSProperties}
      aria-hidden="true"
    >
      {showPhoto ? (
        <>
          <img src={photoUrl} alt="" loading="lazy" decoding="async" onError={() => setBroken(photoUrl)} />
          <i className="crew-badge-hole" />
        </>
      ) : (
        <span>{letters || "?"}</span>
      )}
    </span>
  );
}
