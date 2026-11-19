import { useState, type FormEvent } from "react";
import { useEncoreStore } from "../lib/store";
import { Busy, Wordmark } from "../components/Vinyl";
import { UsernameField, usernameOk, type UsernameStatus } from "../components/UsernameField";

// Shown once to accounts made before usernames existed.
export function PickUsername() {
  const setUsername = useEncoreStore((s) => s.setUsername);
  const signOut = useEncoreStore((s) => s.signOut);
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<UsernameStatus>("empty");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!usernameOk(status) || saving) return;
    setSaving(true);
    setError(null);
    const err = await setUsername(value);
    setSaving(false);
    if (err) setError(err);
  }

  return (
    <div className="welcome-screen">
      <h1 style={{ fontSize: "2.4rem", margin: "0 0 0.8rem", lineHeight: 1.1 }}>
        <Wordmark />
      </h1>
      <h2 className="display" style={{ fontSize: "1.5rem", margin: "0 0 0.4rem" }}>
        Pick your username
      </h2>
      <p style={{ color: "var(--smoke)", margin: "0 0 1.4rem", maxWidth: "320px" }}>
        It's how people find you, add you as a plus-one and invite you to crews.
      </p>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: "320px" }}>
        <div className="field">
          <label htmlFor="pick-username">Username</label>
          <UsernameField id="pick-username" value={value} onChange={setValue} onStatus={setStatus} autoFocus />
        </div>
        {error && <p style={{ color: "var(--glow-core)", fontSize: "0.85rem", margin: "0 0 1rem" }}>{error}</p>}
        <button type="submit" className="sticker-btn" style={{ width: "100%" }} disabled={!usernameOk(status) || saving}>
          {saving ? <Busy>Saving…</Busy> : "Let's go"}
        </button>
        <button type="button" className="text-btn" style={{ display: "block", margin: "1rem auto 0" }} onClick={() => signOut()}>
          Log out
        </button>
      </form>
    </div>
  );
}
