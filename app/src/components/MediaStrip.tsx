import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { isVideoPath, mediaUrl } from "../lib/media";

// A set's photos/videos shown right in a feed card — tap one to see it
// full screen and swipe/arrow through the rest.
export function MediaStrip({ paths, max = 4 }: { paths: string[]; max?: number }) {
  const [open, setOpen] = useState<number | null>(null);
  if (paths.length === 0) return null;
  const shown = paths.slice(0, max);
  const extra = paths.length - shown.length;

  return (
    <>
      <div className={`media-strip count-${Math.min(shown.length, 4)}`}>
        {shown.map((path, i) => (
          <button key={path} type="button" className="media-tile" onClick={() => setOpen(i)} aria-label={`Open ${isVideoPath(path) ? "video" : "photo"} ${i + 1}`}>
            {isVideoPath(path) ? (
              <>
                <video src={`${mediaUrl(path)}#t=0.1`} muted playsInline preload="metadata" />
                <span className="media-play" aria-hidden="true">▶</span>
              </>
            ) : (
              <img src={mediaUrl(path)} alt="" loading="lazy" decoding="async" />
            )}
            {i === shown.length - 1 && extra > 0 && <span className="media-more">+{extra}</span>}
          </button>
        ))}
      </div>
      {open !== null && <Lightbox paths={paths} start={open} onClose={() => setOpen(null)} />}
    </>
  );
}

export function Lightbox({ paths, start, onClose }: { paths: string[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const [touchX, setTouchX] = useState<number | null>(null);
  const go = (d: number) => setI((v) => (v + d + paths.length) % paths.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const path = paths[i];
  return createPortal(
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onClick={onClose}
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        setTouchX(null);
      }}
    >
      <div className="lightbox-media" onClick={(e) => e.stopPropagation()}>
        {isVideoPath(path) ? (
          <video key={path} src={mediaUrl(path)} controls autoPlay playsInline />
        ) : (
          <img key={path} src={mediaUrl(path)} alt="" />
        )}
      </div>
      <button type="button" className="lightbox-close" onClick={onClose} aria-label="Close">
        ✕
      </button>
      {paths.length > 1 && (
        <div className="lightbox-dots" onClick={(e) => e.stopPropagation()}>
          {paths.map((p, j) => (
            <button key={p} type="button" className={j === i ? "on" : ""} onClick={() => setI(j)} aria-label={`Go to ${j + 1}`} />
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
