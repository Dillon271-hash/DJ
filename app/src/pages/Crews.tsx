import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { createCrew, CREW_COLORS, useSocial } from "../lib/social";
import { PeoplePicker, useToggleSet } from "../components/PeoplePicker";
import { Busy, Loader } from "../components/Vinyl";
import { CrewBadge } from "../components/CrewBadge";
import { UserAvatar } from "../components/UserAvatar";

export function Crews() {
  const crews = useSocial((s) => s.crews);
  const setupNeeded = useSocial((s) => s.setupNeeded);
  const acceptCrewInvite = useSocial((s) => s.acceptCrewInvite);
  const declineCrewInvite = useSocial((s) => s.declineCrewInvite);
  const [creating, setCreating] = useState(false);
  const [busyInvite, setBusyInvite] = useState<string | null>(null);
  const navigate = useNavigate();

  if (setupNeeded) {
    return (
      <div className="empty-state">
        <h2 className="display" style={{ fontSize: "1.4rem", margin: "0 0 0.6rem" }}>
          One setup step left
        </h2>
        <p style={{ margin: 0 }}>Re-run supabase/schema.sql in your Supabase SQL Editor to turn on crews.</p>
      </div>
    );
  }
  if (!crews) return <Loader label="Loading your crews" />;

  async function respond(crewId: string, accept: boolean) {
    setBusyInvite(crewId);
    try {
      if (accept) {
        await acceptCrewInvite(crewId);
        navigate(`/crews/${crewId}`);
      } else await declineCrewInvite(crewId);
    } finally {
      setBusyInvite(null);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">Crews</div>
          <h1 className="display page-title">Your crews</h1>
        </div>
        <button type="button" className="sticker-btn" onClick={() => setCreating(true)}>
          + Start
        </button>
      </div>

      {crews.invites.length > 0 && (
        <section className="request-block">
          <div className="section-label">
            Crew invites <span className="count-dot">{crews.invites.length}</span>
          </div>
          {crews.invites.map((inv) => (
            <div key={inv.crewId} className="request-row">
              <div className="request-who">
                <CrewBadge name={inv.name} color={inv.color} size={40} />
                <span>
                  <b>{inv.name}</b>
                  <small>{inv.invitedBy ? `${inv.invitedBy} invited you` : "You're invited"}</small>
                </span>
              </div>
              <button
                type="button"
                className="plus-btn accept compact"
                disabled={busyInvite === inv.crewId}
                onClick={() => respond(inv.crewId, true)}
              >
                Join
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Decline ${inv.name}`}
                disabled={busyInvite === inv.crewId}
                onClick={() => respond(inv.crewId, false)}
              >
                ✕
              </button>
            </div>
          ))}
        </section>
      )}

      {crews.mine.length === 0 ? (
        <div className="crews-empty">
          <div className="crews-empty-art" aria-hidden="true">
            <CrewBadge name="You" color={0} size={64} />
            <CrewBadge name="Plus One" color={2} size={64} />
            <CrewBadge name="Crew" color={4} size={64} />
          </div>
          <h2 className="display" style={{ fontSize: "1.3rem", margin: "0 0 0.5rem" }}>
            Roll deep
          </h2>
          <p>
            Start a crew with the people you go out with. Everyone's sets land on one crew page, and every spin
            you earn counts toward your crew on the Charts.
          </p>
          <button type="button" className="sticker-btn" onClick={() => setCreating(true)}>
            Start a crew
          </button>
        </div>
      ) : (
        <div className="crew-list">
          {crews.mine.map((c) => (
            <Link key={c.id} to={`/crews/${c.id}`} className="crew-card" style={crewTint(c.color)}>
              <CrewBadge name={c.name} color={c.color} size={56} />
              <div className="crew-card-info">
                <div className="crew-card-name">{c.name}</div>
                <div className="avatar-stack">
                  {c.members.slice(0, 5).map((m) => (
                    <UserAvatar key={m.id} id={m.id} name={m.name} size={24} />
                  ))}
                  <span className="meta">
                    {c.memberCount} member{c.memberCount === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              <div className="crew-card-spins">
                <b>{c.spins.toLocaleString()}</b>
                <span>spins</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {creating && <NewCrewSheet onClose={() => setCreating(false)} />}
    </div>
  );
}

export function crewTint(color: number) {
  const [a, b] = CREW_COLORS[color % CREW_COLORS.length] ?? CREW_COLORS[0];
  return { "--a": a, "--b": b } as CSSProperties;
}

function NewCrewSheet({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [color, setColor] = useState(0);
  const [picked, toggle] = useToggleSet();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const id = await createCrew(name, color, [...picked]);
      navigate(`/crews/${id}`);
    } catch (err) {
      console.error("[crew] create failed:", err);
      setError("Couldn't start that crew — check your connection and try again.");
      setSaving(false);
    }
  }

  return (
    <Sheet onClose={onClose} label="Start a crew">
      <form onSubmit={submit}>
        <div className="new-crew-preview">
          <CrewBadge name={name || "Crew"} color={color} size={84} />
        </div>
        <h2 className="display sheet-title">Start a crew</h2>

        <label className="field-label" htmlFor="crew-name">
          Crew name
        </label>
        <input
          id="crew-name"
          className="text-input"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          placeholder="Front Left Speaker Club"
          autoFocus
        />

        <div className="field-label">Color</div>
        <div className="swatches" role="radiogroup" aria-label="Crew color">
          {CREW_COLORS.map(([a, b], i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={color === i}
              aria-label={`Color ${i + 1}`}
              className={`swatch${color === i ? " on" : ""}`}
              style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
              onClick={() => setColor(i)}
            />
          ))}
        </div>

        <div className="field-label">
          Invite {picked.size > 0 && <span className="muted">· {picked.size} picked</span>}
        </div>
        <PeoplePicker picked={picked} onToggle={toggle} />

        {error && <p className="flow-error">{error}</p>}

        <div className="sheet-actions">
          <button type="button" className="ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="sticker-btn" disabled={!name.trim() || saving}>
            {saving ? <Busy>Starting…</Busy> : "Start crew"}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

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
