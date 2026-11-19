import { useState, type MouseEvent } from "react";
import { useSocial, type Mini } from "../lib/social";

// Add / Requested / Accept / Plus-one ✓ — the one button for a person.
export function PlusOneButton({ person, compact = false }: { person: Mini; compact?: boolean }) {
  const state = useSocial((s) => s.stateWith(person.id));
  const ready = useSocial((s) => s.plusOnes !== null);
  const { addPlusOne, acceptPlusOne, removePlusOne } = useSocial.getState();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      console.error("[plus-one]", e);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!ready) return null;
  const stop = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (state === "friends") {
    return confirming ? (
      <button type="button" className={`plus-btn danger${compact ? " compact" : ""}`} disabled={busy} onClick={(e) => (stop(e), run(() => removePlusOne(person.id)))}>
        Remove?
      </button>
    ) : (
      <button type="button" className={`plus-btn on${compact ? " compact" : ""}`} onClick={(e) => (stop(e), setConfirming(true))} onBlur={() => setConfirming(false)}>
        <span aria-hidden="true">✓</span> Plus-one
      </button>
    );
  }
  if (state === "outgoing") {
    return (
      <button type="button" className={`plus-btn pending${compact ? " compact" : ""}`} disabled={busy} onClick={(e) => (stop(e), run(() => removePlusOne(person.id)))} title="Tap to cancel request">
        Requested
      </button>
    );
  }
  if (state === "incoming") {
    return (
      <button type="button" className={`plus-btn accept${compact ? " compact" : ""}`} disabled={busy} onClick={(e) => (stop(e), run(() => acceptPlusOne(person)))}>
        Accept
      </button>
    );
  }
  return (
    <button type="button" className={`plus-btn${compact ? " compact" : ""}`} disabled={busy} onClick={(e) => (stop(e), run(() => addPlusOne(person)))}>
      <span aria-hidden="true">+</span> Add
    </button>
  );
}
