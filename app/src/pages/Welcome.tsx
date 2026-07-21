import { useState, type FormEvent } from "react";
import { useEncoreStore } from "../lib/store";

export function Welcome() {
  const setProfile = useEncoreStore((s) => s.setProfile);
  const [name, setName] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setProfile({ name: trimmed });
  }

  return (
    <div className="welcome-screen">
      <span className="mark lg" aria-hidden="true" />
      <h1 className="display" style={{ fontSize: "2.1rem", margin: "1.2rem 0 0.4rem" }}>
        Encore
      </h1>
      <p style={{ color: "var(--smoke)", margin: "0 0 2rem" }}>
        Your personal ranked diary for DJ sets. Log who you've heard, rate
        them, and build your all-time list.
      </p>
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: "320px" }}>
        <div className="field">
          <label htmlFor="welcome-name">What should we call you?</label>
          <input
            id="welcome-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
            required
          />
        </div>
        <button type="submit" className="sticker-btn" style={{ width: "100%" }}>
          Get started
        </button>
      </form>
    </div>
  );
}
