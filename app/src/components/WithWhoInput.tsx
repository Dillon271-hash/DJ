import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useEncoreStore, type ProfileMatch } from "../lib/store";

export interface WithTag {
  name: string;
  userId?: string;
}

/** "Who were you with?" — type a name and Disko users matching it pop up
 * to tag; anyone not on Disko can still be added as a plain name. */
export function WithWhoInput({ tags, onChange }: { tags: WithTag[]; onChange: (tags: WithTag[]) => void }) {
  const searchProfiles = useEncoreStore((s) => s.searchProfiles);
  const [text, setText] = useState("");
  const [matches, setMatches] = useState<ProfileMatch[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const blurTimer = useRef<number | undefined>(undefined);

  const trimmed = text.trim();

  useEffect(() => {
    if (!trimmed) {
      setMatches([]);
      return;
    }
    let stale = false;
    const t = window.setTimeout(() => {
      searchProfiles(trimmed).then((m) => {
        if (stale) return;
        const tagged = new Set(tags.map((x) => x.userId).filter(Boolean));
        setMatches(m.filter((p) => !tagged.has(p.id)));
        setActive(0);
      });
    }, 200);
    return () => {
      stale = true;
      window.clearTimeout(t);
    };
  }, [trimmed, searchProfiles, tags]);

  // Popup rows: matching Disko users, then "add as a plain name".
  const options: WithTag[] = [
    ...matches.map((m) => ({ name: m.name, userId: m.id })),
    ...(trimmed ? [{ name: trimmed }] : []),
  ];

  function add(tag: WithTag) {
    const dup = tags.some((t) => (tag.userId ? t.userId === tag.userId : !t.userId && t.name.toLowerCase() === tag.name.toLowerCase()));
    if (!dup) onChange([...tags, tag]);
    setText("");
    setMatches([]);
    setActive(0);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && options.length) {
      e.preventDefault();
      setActive((a) => (a + (e.key === "ArrowDown" ? 1 : options.length - 1)) % options.length);
    } else if (e.key === "Enter" || e.key === ",") {
      if (!trimmed) return;
      e.preventDefault();
      add(options[active] ?? { name: trimmed });
    } else if (e.key === "Backspace" && !text && tags.length) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="with-who">
      <div className="with-who-field">
        {tags.map((t, i) => (
          <span key={`${t.userId ?? t.name}-${i}`} className={`with-chip ${t.userId ? "user" : ""}`}>
            {t.userId && <span className="with-chip-avatar">{t.name.charAt(0).toUpperCase()}</span>}
            {t.name}
            <button type="button" aria-label={`Remove ${t.name}`} onClick={() => onChange(tags.filter((_, j) => j !== i))}>
              ✕
            </button>
          </span>
        ))}
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={onKeyDown}
          placeholder={tags.length ? "Add someone else" : "Search friends on Disko, or type a name"}
          aria-label="Who were you with"
          aria-autocomplete="list"
          autoComplete="off"
        />
      </div>

      {open && options.length > 0 && (
        <ul className="with-popup" role="listbox">
          {options.map((o, i) => (
            <li key={o.userId ?? `name:${o.name}`}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                className={i === active ? "active" : ""}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  window.clearTimeout(blurTimer.current);
                  add(o);
                }}
              >
                <span className={`with-popup-avatar ${o.userId ? "user" : ""}`}>
                  {o.userId ? o.name.charAt(0).toUpperCase() : "+"}
                </span>
                <span className="with-popup-text">
                  <span className="with-popup-name">{o.userId ? o.name : `Add “${o.name}”`}</span>
                  <span className="with-popup-meta">{o.userId ? "On Disko — tag them" : "Not on Disko"}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
