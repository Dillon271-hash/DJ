import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { cleanUsername, useEncoreStore } from "../lib/store";
import { Sheet } from "./Sheet";
import { UserAvatar } from "./UserAvatar";
import { Busy, Vinyl } from "./Vinyl";
import { UsernameField, usernameOk, type UsernameStatus } from "./UsernameField";
import { removeAvatar, setAvatar, useAvatars } from "../lib/avatars";

// Your account: username (and changing it), shortcuts, log out.
export function AccountSheet({ onClose }: { onClose: () => void }) {
  const me = useEncoreStore((s) => s.session?.user.id ?? "");
  const email = useEncoreStore((s) => s.session?.user.email ?? "");
  const username = useEncoreStore((s) => s.username);
  const setUsername = useEncoreStore((s) => s.setUsername);
  const signOut = useEncoreStore((s) => s.signOut);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(username ?? "");
  const [status, setStatus] = useState<UsernameStatus>("same");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const hasPhoto = useAvatars((s) => Boolean(s.paths[me]));
  const photoInput = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  async function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError(null);
    const err = await setAvatar(file);
    setPhotoBusy(false);
    if (err) setPhotoError(err);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!usernameOk(status) || saving) return;
    setSaving(true);
    setError(null);
    const err = await setUsername(cleanUsername(value));
    setSaving(false);
    if (err) setError(err);
    else {
      setEditing(false);
      setSaved(true);
    }
  }

  const shown = username || "you";

  return (
    <Sheet onClose={onClose} label="Your account">
      <div className="account-head">
        <button
          type="button"
          className="account-photo"
          onClick={() => photoInput.current?.click()}
          disabled={photoBusy}
          aria-label={hasPhoto ? "Change profile photo" : "Add profile photo"}
        >
          <UserAvatar id={me} name={shown} size={72} />
          <span className="account-photo-badge" aria-hidden="true">
            {photoBusy ? <Vinyl size={16} spin /> : "＋"}
          </span>
        </button>
        <div>
          <div className="account-name">@{shown}</div>
          <div className="account-email">{email}</div>
          <div className="account-photo-actions">
            <button type="button" className="text-btn" onClick={() => photoInput.current?.click()} disabled={photoBusy}>
              {photoBusy ? "Uploading…" : hasPhoto ? "Change photo" : "Add a photo"}
            </button>
            {hasPhoto && !photoBusy && (
              <button type="button" className="text-btn" onClick={() => removeAvatar()}>
                Remove
              </button>
            )}
          </div>
        </div>
        <input ref={photoInput} type="file" accept="image/*" onChange={onPhoto} hidden />
      </div>
      {photoError && <p className="flow-error" style={{ margin: "-0.6rem 0 1rem" }}>{photoError}</p>}

      {username !== "" &&
        (editing ? (
          <form onSubmit={submit}>
            <label className="field-label" htmlFor="account-username">
              New username
            </label>
            <UsernameField id="account-username" value={value} onChange={setValue} onStatus={setStatus} current={username} autoFocus />
            {error && <p className="flow-error">{error}</p>}
            <div className="sheet-actions">
              <button type="button" className="ghost-btn" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button type="submit" className="sticker-btn" disabled={!usernameOk(status) || saving}>
                {saving ? <Busy>Saving…</Busy> : "Save username"}
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="account-row" onClick={() => setEditing(true)}>
            <span>Change username</span>
            <small>{saved ? "Saved ✓" : `@${shown}`}</small>
          </button>
        ))}

      {!editing && (
        <>
          <Link to="/charts" className="account-row" onClick={onClose}>
            <span>The Charts</span>
            <small>Leaderboards</small>
          </Link>
          <button type="button" className="account-row danger" onClick={() => signOut()}>
            <span>Log out</span>
          </button>
        </>
      )}
    </Sheet>
  );
}
