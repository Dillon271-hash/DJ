import { useState, type FormEvent } from "react";
import { useEncoreStore } from "../lib/store";

type Mode = "signup" | "login" | "forgot";
type Notice = "confirm-signup" | "reset-sent";

export function Welcome() {
  const signUp = useEncoreStore((s) => s.signUp);
  const signIn = useEncoreStore((s) => s.signIn);
  const requestPasswordReset = useEncoreStore((s) => s.requestPasswordReset);
  const authLinkError = useEncoreStore((s) => s.authLinkError);
  const clearAuthLinkError = useEncoreStore((s) => s.clearAuthLinkError);

  // Someone landing here from an expired email link almost certainly
  // wants to log in or request a fresh link, not create an account.
  const [mode, setMode] = useState<Mode>(authLinkError ? "login" : "signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    clearAuthLinkError();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    clearAuthLinkError();
    setSubmitting(true);
    const trimmedEmail = email.trim();
    const result =
      mode === "signup"
        ? await signUp(trimmedEmail, password, name.trim())
        : mode === "login"
          ? await signIn(trimmedEmail, password)
          : await requestPasswordReset(trimmedEmail);
    setSubmitting(false);
    if (result) {
      setError(result);
      return;
    }
    // If email confirmation is on for this Supabase project, signUp()
    // succeeds but doesn't create a session yet — the account isn't
    // usable until they click the link Supabase just emailed them.
    if (mode === "signup") setNotice("confirm-signup");
    if (mode === "forgot") setNotice("reset-sent");
  }

  if (notice) {
    return (
      <div className="welcome-screen">
        <span className="mark lg" aria-hidden="true" />
        <h1 className="display" style={{ fontSize: "1.8rem", margin: "1.2rem 0 0.4rem" }}>
          Check your email
        </h1>
        <p style={{ color: "var(--smoke)", maxWidth: "320px" }}>
          {notice === "confirm-signup"
            ? `We sent a confirmation link to ${email}. Click it, then come back here and log in.`
            : // Supabase deliberately reports success even for addresses
              // with no account, so it can't be used to probe who's
              // signed up — this wording stays honest about that.
              `If there's an account for ${email}, we've sent it a link to choose a new password. It may take a minute — check spam too.`}
        </p>
        <button
          type="button"
          className="ghost-btn"
          style={{ marginTop: "1.4rem" }}
          onClick={() => {
            setNotice(null);
            switchMode("login");
            setPassword("");
          }}
        >
          Back to log in
        </button>
      </div>
    );
  }

  const submitLabel = mode === "signup" ? "Create account" : mode === "login" ? "Log in" : "Send reset link";

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

      {authLinkError && (
        <p className="auth-notice" role="alert">
          {authLinkError}. Request a new link below.
        </p>
      )}

      {mode === "forgot" ? (
        <div style={{ width: "100%", maxWidth: "320px", marginBottom: "1.2rem" }}>
          <h2 className="display" style={{ fontSize: "1.2rem", margin: "0 0 0.3rem" }}>
            Reset your password
          </h2>
          <p style={{ color: "var(--smoke)", fontSize: "0.85rem", margin: 0 }}>
            Enter the email you signed up with and we'll send you a link to choose a new one.
          </p>
        </div>
      ) : (
        <div className="chip-row" style={{ marginBottom: "1.2rem" }}>
          <button
            type="button"
            className={`chip ${mode === "signup" ? "active" : ""}`}
            onClick={() => switchMode("signup")}
          >
            Sign up
          </button>
          <button
            type="button"
            className={`chip ${mode === "login" ? "active" : ""}`}
            onClick={() => switchMode("login")}
          >
            Log in
          </button>
        </div>
      )}

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
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoFocus={mode !== "signup"}
            required
          />
        </div>
        {mode !== "forgot" && (
          <div className="field">
            <label htmlFor="welcome-password">Password</label>
            <input
              id="welcome-password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
            {mode === "login" && (
              <button
                type="button"
                className="text-btn"
                style={{ alignSelf: "flex-end" }}
                onClick={() => switchMode("forgot")}
              >
                Forgot password?
              </button>
            )}
          </div>
        )}

        {error && (
          <p style={{ color: "var(--glow-core)", fontSize: "0.85rem", margin: "0 0 1rem" }}>{error}</p>
        )}

        <button type="submit" className="sticker-btn" style={{ width: "100%" }} disabled={submitting}>
          {submitting ? "Please wait…" : submitLabel}
        </button>

        {mode === "forgot" && (
          <button
            type="button"
            className="text-btn"
            style={{ display: "block", margin: "1rem auto 0" }}
            onClick={() => switchMode("login")}
          >
            Back to log in
          </button>
        )}
      </form>
    </div>
  );
}
