import type { CSSProperties } from "react";
import { CREW_COLORS } from "../lib/social";

// A crew's badge: a record whose label is the crew's color, with their
// initials on it.
export function CrewBadge({ name, color, size = 48 }: { name: string; color: number; size?: number }) {
  const [a, b] = CREW_COLORS[color % CREW_COLORS.length] ?? CREW_COLORS[0];
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
  return (
    <span
      className="crew-badge"
      style={{ "--size": `${size}px`, "--a": a, "--b": b } as CSSProperties}
      aria-hidden="true"
    >
      <span>{letters || "?"}</span>
    </span>
  );
}
