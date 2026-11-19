import { useEffect, useMemo, useState } from "react";
import { fetchPeople, useSocial, type Mini } from "../lib/social";
import { useEncoreStore } from "../lib/store";
import { UserAvatar } from "./UserAvatar";

const NO_PEOPLE: Mini[] = [];

// Pick people to invite: your plus-ones listed up front, anyone else on
// Disko found by searching.
export function PeoplePicker({
  picked,
  onToggle,
  exclude = NO_PEOPLE,
}: {
  picked: Set<string>;
  onToggle: (id: string) => void;
  exclude?: Mini[];
}) {
  const me = useEncoreStore((s) => s.session?.user.id ?? "");
  const friends = useSocial((s) => s.plusOnes?.friends ?? NO_PEOPLE);
  const [everyone, setEveryone] = useState<Mini[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchPeople(me)
      .then(setEveryone)
      .catch(() => setEveryone([]));
  }, [me]);

  const q = query.trim().toLowerCase();
  const candidates = useMemo(() => {
    const skip = new Set(exclude.map((p) => p.id));
    const friendIds = new Set(friends.map((f) => f.id));
    const pool = q ? [...friends, ...everyone.filter((p) => !friendIds.has(p.id))] : friends;
    return pool.filter((p) => !skip.has(p.id) && (!q || p.name.toLowerCase().includes(q)));
  }, [friends, everyone, exclude, q]);

  return (
    <>
      <input
        className="text-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={friends.length ? "Search plus-ones or anyone on Disko" : "Search anyone on Disko"}
        aria-label="Search people to invite"
      />
      <div className="invite-list">
        {candidates.length === 0 ? (
          <p className="hint">
            {q ? `No one called “${query.trim()}”.` : "Search for people to invite — your plus-ones show up here."}
          </p>
        ) : (
          candidates.slice(0, 30).map((p) => (
            <button
              key={p.id}
              type="button"
              className={`invite-pick${picked.has(p.id) ? " on" : ""}`}
              onClick={() => onToggle(p.id)}
              aria-pressed={picked.has(p.id)}
            >
              <UserAvatar id={p.id} name={p.name} size={32} />
              <span>{p.name}</span>
              <span className="check" aria-hidden="true">
                {picked.has(p.id) ? "✓" : "+"}
              </span>
            </button>
          ))
        )}
      </div>
    </>
  );
}

export function useToggleSet() {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  return [picked, toggle] as const;
}
