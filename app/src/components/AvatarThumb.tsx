import { useEffect, useState } from "react";
import { fetchArtistImage } from "../lib/artistImage";

// Small circular avatar that resolves automatically on mount — no click
// needed. Backed by the same cached lookup as the artist page, so an
// artist that appears many times in a list only triggers one network
// request. Falls back to initials, same as the artist page.
export function AvatarThumb({ name }: { name: string }) {
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setImage(null);
    fetchArtistImage(name).then((url) => {
      if (!cancelled) setImage(url);
    });
    return () => {
      cancelled = true;
    };
  }, [name]);

  return (
    <span className="avatar-thumb" aria-hidden="true">
      {image ? <img src={image} alt="" referrerPolicy="no-referrer" onError={() => setImage(null)} /> : initials(name)}
    </span>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
