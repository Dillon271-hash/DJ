import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Vinyl } from "./Vinyl";

// Opening animation: a record rolls in from the left, spins up, then
// shrinks into place as the O in ENCORE while the other letters slide out
// from behind it. Plays once per app load, sits on top of whatever is
// loading underneath, and a tap skips it.

const ROLL_MS = 750;
const FLY_MS = 850;
const HOLD_UNTIL_MS = 2150;
const FADE_MS = 300;

export function Splash({ onDone }: { onDone: () => void }) {
  const recordRef = useRef<HTMLSpanElement>(null);
  const slotRef = useRef<HTMLSpanElement>(null);
  const [leaving, setLeaving] = useState(false);
  const [big] = useState(() => Math.round(Math.min(180, window.innerWidth * 0.46)));

  useLayoutEffect(() => {
    const record = recordRef.current?.firstElementChild as HTMLElement | null;
    const slot = slotRef.current;
    if (!record || !slot) return;

    const r = record.getBoundingClientRect();
    const s = slot.getBoundingClientRect();
    const dx = s.left + s.width / 2 - (r.left + r.width / 2);
    const dy = s.top + s.height / 2 - (r.top + r.height / 2);
    const scale = s.width / r.width;
    const landed = `translate(${dx}px, ${dy}px) rotate(540deg) scale(${scale})`;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      record.style.transform = landed;
      return;
    }

    // Rolls (rather than slides) in: one full turn per circumference
    // travelled, so the grooves' sheen reads as real rolling.
    const distance = r.right;
    const turns = (distance / (Math.PI * r.width)) * 360;
    const total = ROLL_MS + FLY_MS;
    const anim = record.animate(
      [
        { transform: `translateX(${-distance}px) rotate(${-turns}deg)`, easing: "cubic-bezier(.16,.84,.3,1)" },
        { offset: ROLL_MS / total, transform: "translate(0, 0) rotate(0deg) scale(1)", easing: "cubic-bezier(.55,0,.2,1)" },
        { transform: landed },
      ],
      { duration: total, fill: "both" },
    );
    return () => anim.cancel();
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => setLeaving(true), reduce ? 700 : HOLD_UNTIL_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(onDone, FADE_MS);
    return () => window.clearTimeout(t);
  }, [leaving, onDone]);

  return (
    <div
      className={`splash${leaving ? " leaving" : ""}`}
      onClick={() => setLeaving(true)}
      style={{ "--fade": `${FADE_MS}ms` } as CSSProperties}
      aria-hidden="true"
    >
      <div className="splash-center">
        <div className="splash-word display">
          {"ENC".split("").map((ch, i) => (
            <span key={`l${i}`} className="splash-letter from-o-right" style={{ "--i": 2 - i } as CSSProperties}>
              {ch}
            </span>
          ))}
          <span ref={slotRef} className="splash-slot" />
          {"RE".split("").map((ch, i) => (
            <span key={`r${i}`} className="splash-letter from-o-left" style={{ "--i": i } as CSSProperties}>
              {ch}
            </span>
          ))}
        </div>
        <p className="splash-tag eyebrow">Rank every set</p>
      </div>
      <span ref={recordRef} className="splash-record">
        <Vinyl size={big} />
      </span>
    </div>
  );
}
