import { useEffect, useState } from "react";
import { cleanUsername, useEncoreStore, USERNAME_RE, type UsernameCheck } from "../lib/store";

export type UsernameStatus = UsernameCheck | "checking" | "empty" | "same";

// "@username" input that checks availability as you type.
export function UsernameField({
  id,
  value,
  onChange,
  onStatus,
  current,
  autoFocus,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onStatus: (s: UsernameStatus) => void;
  /** Your existing username, if changing it. */
  current?: string | null;
  autoFocus?: boolean;
}) {
  const checkUsername = useEncoreStore((s) => s.checkUsername);
  const [status, setStatus] = useState<UsernameStatus>("empty");

  useEffect(() => {
    const u = cleanUsername(value);
    let next: UsernameStatus | null = null;
    if (!u) next = "empty";
    else if (current && u === current) next = "same";
    else if (!USERNAME_RE.test(u)) next = "invalid";
    if (next) {
      setStatus(next);
      onStatus(next);
      return;
    }
    setStatus("checking");
    onStatus("checking");
    let stale = false;
    const t = window.setTimeout(async () => {
      const r = await checkUsername(u);
      if (stale) return;
      setStatus(r);
      onStatus(r);
    }, 350);
    return () => {
      stale = true;
      window.clearTimeout(t);
    };
    // onStatus is a setter from the parent; re-running on it isn't needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, current, checkUsername]);

  const u = cleanUsername(value);
  const message =
    status === "invalid"
      ? u.length < 3
        ? "At least 3 characters"
        : u.length > 20
          ? "20 characters max"
          : "Only letters, numbers, _ and ."
      : status === "taken"
        ? `@${u} is taken`
        : status === "available"
          ? `@${u} is yours`
          : status === "checking"
            ? "Checking…"
            : status === "same"
              ? "That's your current username"
              : "3–20 letters, numbers, _ or .";

  return (
    <>
      <div className={`username-input ${status}`}>
        <span aria-hidden="true">@</span>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\s/g, "").toLowerCase())}
          placeholder="yourname"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={21}
          autoFocus={autoFocus}
          required
          aria-describedby={`${id}-hint`}
        />
        <span className="username-mark" aria-hidden="true">
          {status === "available" ? "✓" : status === "taken" || status === "invalid" ? "✕" : ""}
        </span>
      </div>
      <p id={`${id}-hint`} className={`username-hint ${status}`} aria-live="polite">
        {message}
      </p>
    </>
  );
}

/** Whether a status is good enough to submit. */
export const usernameOk = (s: UsernameStatus) => s === "available" || s === "unknown";
