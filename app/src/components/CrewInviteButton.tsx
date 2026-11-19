import { useEffect, useRef, useState } from "react";
import { inviteToCrew, useSocial, type CrewSummary, type Mini } from "../lib/social";
import { CrewBadge } from "./CrewBadge";

const NO_CREWS: CrewSummary[] = [];

// "Invite to crew" with a little menu of the crews you're in.
export function CrewInviteButton({ person }: { person: Mini }) {
  const crews = useSocial((s) => s.crews?.mine ?? NO_CREWS);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const eligible = crews.filter((c) => !c.members.some((m) => m.id === person.id));
  if (eligible.length === 0) return null;

  async function invite(crewId: string) {
    try {
      await inviteToCrew(crewId, [person.id]);
      setSent((s) => new Set(s).add(crewId));
    } catch (e) {
      console.error("[crew invite]", e);
    }
  }

  return (
    <div className="crew-invite" ref={ref}>
      <button type="button" className="plus-btn ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        Invite to crew
      </button>
      {open && (
        <div className="crew-invite-menu" role="menu">
          {eligible.map((c) => (
            <button key={c.id} type="button" role="menuitem" disabled={sent.has(c.id)} onClick={() => invite(c.id)}>
              <CrewBadge name={c.name} color={c.color} size={30} />
              <span>{c.name}</span>
              <small>{sent.has(c.id) ? "Invited ✓" : "Invite"}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
