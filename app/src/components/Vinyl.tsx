import type { CSSProperties, ReactNode } from "react";

// The brand's vinyl record — grooves, a light sheen and the glowing Disko
// label. Used as the "O" in the wordmark, the opening animation, and every
// loading state (spinning).
export function Vinyl({
  size = 40,
  spin = false,
  className = "",
}: {
  size?: number | string;
  spin?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`record${spin ? " spinning" : ""}${className ? ` ${className}` : ""}`}
      style={{ "--size": typeof size === "number" ? `${size}px` : size } as CSSProperties}
      aria-hidden="true"
    />
  );
}

// Centered spinning record for a page/section that's loading.
export function Loader({
  label,
  size = 64,
  fullscreen = false,
}: {
  label?: string;
  size?: number;
  fullscreen?: boolean;
}) {
  return (
    <div className={`page-loading${fullscreen ? " fullscreen" : ""}`} role="status" aria-label={label ?? "Loading"}>
      <Vinyl size={size} spin />
      {label && <p className="eyebrow">{label}</p>}
    </div>
  );
}

// "DISKO" with the record standing in for the O.
export function Wordmark({ className = "", spinOnHover = false }: { className?: string; spinOnHover?: boolean }) {
  return (
    <span
      className={`wordmark display${spinOnHover ? " spin-hover" : ""}${className ? ` ${className}` : ""}`}
      role="img"
      aria-label="Disko"
    >
      <span aria-hidden="true">DISK</span>
      <Vinyl size="0.86em" className="wordmark-o" />
    </span>
  );
}

// Button contents while it's working: a small spinning record + label.
export function Busy({ children }: { children: ReactNode }) {
  return (
    <span className="btn-busy">
      <Vinyl size={16} spin />
      {children}
    </span>
  );
}
