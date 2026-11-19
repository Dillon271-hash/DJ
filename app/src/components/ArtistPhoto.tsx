import { useEffect, useState } from "react";
import { fetchArtistImage } from "../lib/artistImage";
import { Vinyl } from "./Vinyl";

// An artist's photo at any size: spinning record while it loads, initials
// if there isn't one. "square" fills its container's width instead.
export function ArtistPhoto({ name, size, square = false }: { name: string; size: number; square?: boolean }) {
  const [image, setImage] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let stale = false;
    setImage(undefined);
    fetchArtistImage(name).then((u) => !stale && setImage(u));
    return () => {
      stale = true;
    };
  }, [name]);
  return (
    <span className={`artist-photo${square ? " square" : ""}`} style={{ width: square ? "100%" : size, height: square ? undefined : size }}>
      {image ? (
        <img src={image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setImage(null)} />
      ) : image === undefined ? (
        <Vinyl size={Math.round(size * 0.45)} spin />
      ) : (
        <span className="artist-photo-initials">{initials(name)}</span>
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
