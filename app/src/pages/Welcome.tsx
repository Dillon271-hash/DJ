import { useState, type FormEvent } from "react";
import { useEncoreStore } from "../lib/store";

type Mode = "signup" | "login";

export function Welcome() {
  const signUp = useEncoreStore((s) => s.signUp);
  const signIn = useEncoreStore((s) => s.signIn);

  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result =
      mode === "signup" ? await signUp(email.trim(), password, name.trim()) : await signIn(email.trim(), password);
    setSubmitting(false);
    if (result) {
      setError(result);
      return;
    }
    if (mode === "signup") {
      // If email confirmation is on for this Supabase project, signUp()
      // succeeds but doesn't create a session yet — the account isn't
      // usable until they click the link Supabase just emailed them.
      setCheckEmail(true);
    }
  }

  if (checkEmail) {
    return (
      <div className="welcome-screen">
        <span className="mark lg" aria-hidden="true" />
        <h1 className="display" style={{ fontSize: "1.8rem", margin: "1.2rem 0 0.4rem" }}>
          Check your email
        </h1>
        <p style={{ color: "var(--smoke)", maxWidth: "320px" }}>
          We sent a confirmation link to {email}. Click it, then come back
          here and log in.
        </p>
        <button
          type="button"
          className="ghost-btn"
          style={{ marginTop: "1.4rem" }}
          onClick={() => {
            setCheckEmail(false);
            setMode("login");
            setPassword("");
          }}
        >
          Back to log in
        </button>
      </div>
    );
  }

  return (
    <div className="welcome-screen">
      <span className="mark lg" aria-hidden="true" />
      <h1 className="display" style={{ fontSize: "2.1rem", margin: "1.2rem 0 0.4rem" }}>
        Encore
      </h1>
      <p style={{ color: "var(--smoke)", margin: "0 0 1.6rem" }}>
        Your personal ranked diary for DJ sets. Log who you've heard, rate
        them, and build your all-time list.
      </p>

      <div className="chip-row" style={{ marginBottom: "1.2rem" }}>
        <button
          type="button"
          className={`chip ${mode === "signup" ? "active" : ""}`}
          onClick={() => {
            setMode("signup");
            setError(null);
          }}
        >
          Sign up
        </button>
        <button
          type="button"
          className={`chip ${mode === "login" ? "active" : ""}`}
          onClick={() => {
            setMode("login");
            setError(null);
          }}
        >
          Log in
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: "320px" }}>
        {mode === "signup" && (
          <div className="field">
            <label htmlFor="welcome-name">Your name</label>
            <input
              id="welcome-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
              required
            />
          </div>
        )}
        <div className="field">
          <label htmlFor="welcome-email">Email</label>
          <input
            id="welcome-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoFocus={mode === "login"}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="welcome-password">Password</label>
          <input
            id="welcome-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            minLength={6}
            required
          />
        </div>

        {error && (
          <p style={{ color: "var(--glow-core)", fontSize: "0.85rem", margin: "0 0 1rem" }}>{error}</p>
        )}

        <button type="submit" className="sticker-btn" style={{ width: "100%" }} disabled={submitting}>
          {submitting ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
        </button>
      </form>
    </div>
  );
}
