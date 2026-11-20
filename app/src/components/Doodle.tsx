import { useId } from "react";

// Disko's little hand-drawn characters, used in place of emoji: a venue
// that's a building with legs, a record-headed DJ in headphones, a
// festival tent, and a cast of icons (heart, chat bubble, bookmark, tag,
// map pin, camera). Black ink + googly eyes on Disko-colored tiles with a
// few scribbled sparkles. A turbulence filter wobbles every line so they
// look drawn by hand.

export type DoodleKind = "venue" | "dj" | "festival" | "heart" | "comment" | "save" | "tag" | "pin" | "camera";

const INK = "#0b0b0d";
const PAPER = "#f0deb8";
const ORANGE = "#ff3d22";
const AMBER = "#ffb13b";
const PINK = "#ff1f7a";
const VIOLET = "#6a2ce0";
const YELLOW = "#ffd400";

// Tile color + sparkle color for each character.
const TILE: Record<DoodleKind, [string, string]> = {
  venue: [VIOLET, YELLOW],
  dj: [AMBER, PINK],
  festival: [PINK, YELLOW],
  heart: [PAPER, ORANGE],
  comment: [VIOLET, AMBER],
  save: [YELLOW, PINK],
  tag: [ORANGE, PAPER],
  pin: [PAPER, VIOLET],
  camera: [PINK, PAPER],
};

export function Doodle({
  kind,
  size = 52,
  className = "",
  bare = false,
}: {
  kind: DoodleKind;
  size?: number;
  className?: string;
  /** Just the character, no colored tile behind it. */
  bare?: boolean;
}) {
  const wobble = `wob${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [bg, spark] = TILE[kind];
  const Body = BODIES[kind];
  return (
    <svg
      className={`doodle${bare ? " doodle-bare" : ""} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id={wobble} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed={kind.length * 7} />
          <feDisplacementMap in="SourceGraphic" scale="2.2" />
        </filter>
      </defs>
      {!bare && (
        <>
          <rect width="64" height="64" fill={bg} />
          <Sparkles color={spark} wobble={wobble} />
        </>
      )}
      <g filter={`url(#${wobble})`}>
        <Body />
      </g>
    </svg>
  );
}

/** A few scribbled four-point stars and squiggles in the corners. */
function Sparkles({ color, wobble }: { color: string; wobble: string }) {
  const star = (x: number, y: number, r: number) =>
    `M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r} Z`;
  return (
    <g filter={`url(#${wobble})`} opacity="0.9">
      <path d={star(8.5, 9, 4.5)} fill={color} />
      <path d={star(57, 50, 3.6)} fill={color} />
      <path d={star(55.5, 9.5, 2.4)} fill={color} />
      <path d="M4 50 q3 -4 6 0 t6 0" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="9" cy="60" r="1.6" fill={color} />
    </g>
  );
}

/** Two googly eyes; `look` nudges the pupils (dx, dy). */
function Eyes({ x1, x2, y, r = 4, look = [1, -0.8] }: { x1: number; x2: number; y: number; r?: number; look?: [number, number] }) {
  return (
    <>
      <circle cx={x1} cy={y} r={r} fill="#fff" stroke={INK} strokeWidth="1.4" />
      <circle cx={x2} cy={y} r={r} fill="#fff" stroke={INK} strokeWidth="1.4" />
      <circle cx={x1 + look[0]} cy={y + look[1]} r={r * 0.48} fill={INK} />
      <circle cx={x2 + look[0]} cy={y + look[1]} r={r * 0.48} fill={INK} />
    </>
  );
}

/** Half-closed, unimpressed eyes. */
function SleepyEyes({ x1, x2, y, r = 4.4, lid = INK }: { x1: number; x2: number; y: number; r?: number; lid?: string }) {
  const half = (x: number) => `M${x - r} ${y} A${r} ${r} 0 0 0 ${x + r} ${y} Z`;
  return (
    <>
      <path d={half(x1)} fill="#fff" />
      <path d={half(x2)} fill="#fff" />
      <circle cx={x1} cy={y + r * 0.42} r={r * 0.42} fill={INK} />
      <circle cx={x2} cy={y + r * 0.42} r={r * 0.42} fill={INK} />
      <path d={`M${x1 - r - 0.6} ${y} H${x1 + r + 0.6} M${x2 - r - 0.6} ${y} H${x2 + r + 0.6}`} stroke={lid === INK ? "#fff" : lid} strokeWidth="1.6" strokeLinecap="round" />
    </>
  );
}

function Legs({ a, b, top, bottom = 58 }: { a: number; b: number; top: number; bottom?: number }) {
  return (
    <path
      d={`M${a} ${top} L${a - 1} ${bottom} L${a - 5.5} ${bottom + 1} M${b} ${top} L${b + 1} ${bottom} L${b + 5.5} ${bottom + 1}`}
      stroke={INK}
      strokeWidth="3.2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function Venue() {
  return (
    <>
      <Legs a={25} b={39} top={47} />
      {/* a squat club: flat roof, sign, door */}
      <path d="M14 20 L50 18.5 L49 48 L15 48.5 Z" fill={INK} />
      <path d="M19 12 H45 L44 19 H20 Z" fill={PINK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M24 15.5 H40" stroke={PAPER} strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2.5 2" />
      <path d="M28 48 V39 Q32 35 36 39 V48 Z" fill={AMBER} />
      <SleepyEyes x1={25} x2={39} y={28} />
    </>
  );
}

function Dj() {
  return (
    <>
      <Legs a={26} b={38} top={50} />
      {/* record for a head */}
      <circle cx="32" cy="31" r="19" fill={INK} />
      <circle cx="32" cy="31" r="15.5" fill="none" stroke="#3a3540" strokeWidth="1" />
      <circle cx="32" cy="31" r="12.5" fill="none" stroke="#3a3540" strokeWidth="1" />
      <circle cx="32" cy="31" r="9.5" fill={ORANGE} />
      <Eyes x1={28.2} x2={35.8} y={29} r={2.9} look={[0.6, 0.6]} />
      <path d="M28.5 34.5 Q32 37.5 35.5 34.5" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* headphones */}
      <path d="M12 30 C11 4 53 4 52 30" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="7.5" y="25" width="8" height="12" rx="3.5" fill={VIOLET} stroke={INK} strokeWidth="2" />
      <rect x="48.5" y="25" width="8" height="12" rx="3.5" fill={VIOLET} stroke={INK} strokeWidth="2" />
    </>
  );
}

function Festival() {
  return (
    <>
      <Legs a={25} b={39} top={49} />
      <path d="M32 17 V7" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path d="M32 7.5 L41 10.2 L32 13 Z" fill={AMBER} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M11 50 L32 16 L53 50 Z" fill={INK} />
      <path d="M30.4 41 L26.5 50 M33.6 41 L37.5 50" stroke={YELLOW} strokeWidth="1.4" />
      <path d="M28.5 50 L32 42.5 L35.5 50 Z" fill={YELLOW} />
      <Eyes x1={27.5} x2={36.5} y={33} r={3.4} look={[-0.9, 0.8]} />
    </>
  );
}

function Heart() {
  return (
    <>
      <Legs a={27} b={37} top={46} />
      <path
        d="M32 50 C13 38 9 22 20 16 C26 13 30.5 16.5 32 21 C33.5 16.5 38 13 44 16 C55 22 51 38 32 50 Z"
        fill={PINK}
        stroke={INK}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path d="M22 22 Q20 25 21 28" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.7" />
      <SleepyEyes x1={26.5} x2={37.5} y={29} r={4} />
      <path d="M29 37 Q32 39.5 35 37" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  );
}

function Comment() {
  return (
    <>
      <path
        d="M13 18 Q13 11 20 11 H44 Q51 11 51 18 V36 Q51 43 44 43 H29 L18 53 L21 43 H20 Q13 43 13 36 Z"
        fill={PAPER}
        stroke={INK}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <Eyes x1={25} x2={39} y={24} r={4} look={[-1.2, 0]} />
      {/* mid-sentence */}
      <ellipse cx="32" cy="34.5" rx="4" ry="3" fill={INK} />
    </>
  );
}

function Save() {
  return (
    <>
      <path d="M19 9 H45 V55 L32 44 L19 55 Z" fill={INK} />
      <Eyes x1={26.5} x2={37.5} y={24} r={4.2} look={[0, 1.2]} />
      <path d="M27 34 Q32 37.5 37 34" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  );
}

function Tag() {
  return (
    <>
      <Legs a={32} b={42} top={44} />
      <path d="M9 30 L23 15 H53 V45 H23 Z" fill={YELLOW} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <circle cx="19.5" cy="30" r="3" fill={ORANGE} stroke={INK} strokeWidth="2" />
      <SleepyEyes x1={33} x2={44} y={27} r={3.8} />
      <path d="M34 37 H43" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function Pin() {
  return (
    <>
      <path
        d="M32 59 C22 45 14 37 14 25 C14 14 22 6 32 6 C42 6 50 14 50 25 C50 37 42 45 32 59 Z"
        fill={ORANGE}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="24" r="10" fill="#fff" stroke={INK} strokeWidth="2.4" />
      <circle cx="30" cy="26" r="5" fill={INK} />
    </>
  );
}

function Camera() {
  return (
    <>
      <Legs a={25} b={39} top={46} />
      <path d="M24 20 L27 14 H37 L40 20 Z" fill={INK} />
      <rect x="10" y="19" width="44" height="29" rx="6" fill={INK} />
      <circle cx="32" cy="33.5" r="10" fill="#fff" stroke={AMBER} strokeWidth="2.4" />
      <circle cx="30.5" cy="35" r="5" fill={INK} />
      <circle cx="47.5" cy="25" r="2.4" fill={ORANGE} />
    </>
  );
}

const BODIES: Record<DoodleKind, () => React.JSX.Element> = {
  venue: Venue,
  dj: Dj,
  festival: Festival,
  heart: Heart,
  comment: Comment,
  save: Save,
  tag: Tag,
  pin: Pin,
  camera: Camera,
};
