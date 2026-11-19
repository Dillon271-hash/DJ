import { Link, NavLink } from "react-router-dom";
import { useEncoreStore } from "../lib/store";
import { spinsFor, tierFor } from "../lib/spins";
import { Vinyl, Wordmark } from "./Vinyl";

export function Header() {
  const signOut = useEncoreStore((s) => s.signOut);
  const logs = useEncoreStore((s) => s.logs);
  const spins = spinsFor(logs);

  return (
    <header className="topbar">
      <NavLink to="/" className="topbar-brand" aria-label="Encore home">
        <Wordmark spinOnHover />
      </NavLink>
      <div className="topbar-nav">
        <Link to="/charts" className="spins-pill" title={`${tierFor(spins).tier.name} · ${spins} spins`}>
          <Vinyl size={16} />
          <b>{spins.toLocaleString()}</b>
          <span>spins</span>
        </Link>
        <button type="button" className="topbar-signout" onClick={() => signOut()} aria-label="Log out" title="Log out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
            <path d="M10 17l-5-5 5-5" />
            <path d="M5 12h11" />
          </svg>
        </button>
      </div>
    </header>
  );
}
