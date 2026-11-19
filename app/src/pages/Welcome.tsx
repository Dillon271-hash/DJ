import { useState, type FormEvent } from "react";
import { useEncoreStore } from "../lib/store";

type Mode = "signup" | "login" | "forgot";
type Notice = "confirm-signup" | "reset-sent";

// Supabase's built-in email sender sends sign-up and reset emails before
// it answers, and can occasionally take a very long time to do so. Rather
// than leave the button on "Please wait…" forever, stop waiting after
// this long and say what probably happened.
const AUTH_TIMEOUT_MS = 20_000;

const TIMEOUT_MESSAGE: Record<Mode, string> = {
  signup:
    "Supabase is taking a long time to respond. Your account may still have been created — check your inbox (and spam) for a confirmation email before trying again.",
  forgot:
    "Supabase is taking a long time to send the email. It may still arrive in a minute — check your inbox (and spam) before trying again.",
  login: "Supabase isn't responding. Check your connection and try again in a moment.",
};

function withTimeout(request: Promise<string | null>, mode: Mode): Promise<string | null> {
  return Promise.race([
    request,
    new Promise<string>((resolve) => setTimeout(() => resolve(TIMEOUT_MESSAGE[mode]), AUTH_TIMEOUT_MS)),
  ]);
}

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
  const [existingAccount, setExistingAccount] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setExistingAccount(false);
    clearAuthLinkError();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setExistingAccount(false);
    clearAuthLinkError();
    setSubmitting(true);
    const trimmedEmail = email.trim();
    let alreadyRegistered = false;
    const result = await withTimeout(
      mode === "signup"
        ? signUp(trimmedEmail, password, name.trim()).then((r) => {
            alreadyRegistered = r.existingAccount;
            return r.error;
          })
        : mode === "login"
          ? signIn(trimmedEmail, password)
          : requestPasswordReset(trimmedEmail),
      mode,
    );
    setSubmitting(false);
    if (result) {
      setError(result);
      return;
    }
    if (alreadyRegistered) {
      setExistingAccount(true);
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

        {existingAccount && (
          <div className="auth-notice" role="alert" style={{ maxWidth: "none" }}>
            <p style={{ margin: "0 0 0.6rem" }}>There's already an Encore account for {email.trim()}.</p>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button type="button" className="text-btn" style={{ color: "var(--bone)" }} onClick={() => switchMode("login")}>
                Log in instead
              </button>
              <button type="button" className="text-btn" style={{ color: "var(--bone)" }} onClick={() => switchMode("forgot")}>
                Forgot password?
              </button>
            </div>
          </div>
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
