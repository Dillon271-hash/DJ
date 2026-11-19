import { useEffect, useState } from "react";
import { fetchArtistImage } from "../lib/artistImage";
import { Vinyl } from "./Vinyl";

// Small circular avatar that resolves automatically on mount — no click
// needed. Backed by the same cached lookup as the artist page, so an
// artist that appears many times in a list only triggers one network
// request. Falls back to initials, same as the artist page.
export function AvatarThumb({ name }: { name: string }) {
  // undefined while the lookup runs (spinning record), null if none found.
  const [image, setImage] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setImage(undefined);
    fetchArtistImage(name).then((url) => {
      if (!cancelled) setImage(url);
    });
    return () => {
      cancelled = true;
    };
  }, [name]);

  return (
    <span className="avatar-thumb" aria-hidden="true">
      {image ? (
        <img
          src={image}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImage(null)}
        />
      ) : image === undefined ? (
        <Vinyl size={26} spin />
      ) : (
        initials(name)
      )}
    </span>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
