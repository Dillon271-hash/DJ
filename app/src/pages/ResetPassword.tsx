import { useState, type FormEvent } from "react";
import { useEncoreStore } from "../lib/store";
import { Busy, Vinyl } from "../components/Vinyl";

// Shown after someone opens a password-reset email link. The link has
// already signed them in (that's how Supabase proves they own the
// address), so this just sets the new password on the current account.
export function ResetPassword() {
  const updatePassword = useEncoreStore((s) => s.updatePassword);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await updatePassword(password);
    setSubmitting(false);
    // On success the store clears passwordRecovery and App swaps this
    // screen out for the app itself, so there's nothing else to do here.
    if (result) setError(result);
  }

  return (
    <div className="welcome-screen">
      <Vinyl size={64} />
      <h1 className="display" style={{ fontSize: "1.8rem", margin: "1.2rem 0 0.4rem" }}>
        Choose a new password
      </h1>
      <p style={{ color: "var(--smoke)", margin: "0 0 1.6rem" }}>You'll use this from now on when you log in.</p>

      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: "320px" }}>
        <div className="field">
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            minLength={6}
            autoFocus
            required
          />
        </div>
        <div className="field">
          <label htmlFor="confirm-password">Confirm new password</label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={6}
            required
          />
        </div>

        {error && (
          <p style={{ color: "var(--glow-core)", fontSize: "0.85rem", margin: "0 0 1rem" }}>{error}</p>
        )}

        <button type="submit" className="sticker-btn" style={{ width: "100%" }} disabled={submitting}>
          {submitting ? <Busy>Saving…</Busy> : "Save new password"}
        </button>
      </form>
    </div>
  );
}
