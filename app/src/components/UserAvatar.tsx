import { useState, type CSSProperties } from "react";
import { useAvatarUrl } from "../lib/avatars";

// A person's profile photo — or, until they add one, their initial on a
// gradient picked from their id, so everyone has a stable look.
const GRADIENTS = [
  ["var(--glow-core)", "var(--glow-edge)"],
  ["var(--pink)", "var(--glow-edge)"],
  ["var(--violet)", "var(--pink)"],
  ["#1f8a70", "#7ad3a8"],
  ["#2457d6", "#59b7ff"],
  ["var(--violet)", "#59b7ff"],
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function UserAvatar({ id, name, size = 44 }: { id: string; name: string; size?: number }) {
  const [a, b] = GRADIENTS[hash(id) % GRADIENTS.length];
  const url = useAvatarUrl(id);
  const [broken, setBroken] = useState<string | null>(null);
  return (
    <span
      className="user-avatar"
      style={{ "--size": `${size}px`, background: `linear-gradient(135deg, ${a}, ${b})` } as CSSProperties}
      aria-hidden="true"
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
      {url && broken !== url && (
        <img src={url} alt="" loading="lazy" decoding="async" onError={() => setBroken(url)} />
      )}
    </span>
  );
}
