import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Bottom sheet: slides up over the page, closes on backdrop tap or Escape.
export function Sheet({ onClose, label, children }: { onClose: () => void; label: string; children: ReactNode }) {
  // Callers pass inline closures — keep the latest without re-running the
  // effect (which would re-lock scrolling) on every render.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, []);
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" aria-hidden="true" />
        {children}
      </div>
    </div>,
    document.body,
  );
}
