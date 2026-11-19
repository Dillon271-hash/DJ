import { NavLink } from "react-router-dom";
import { useEncoreStore } from "../lib/store";
import { Wordmark } from "./Vinyl";

export function Header() {
  const signOut = useEncoreStore((s) => s.signOut);
  const navClass = ({ isActive }: { isActive: boolean }) => (isActive ? "active" : "");

  return (
    <header className="topbar">
      <NavLink to="/" className="topbar-brand" aria-label="Encore home">
        <Wordmark spinOnHover />
      </NavLink>
      <nav className="topbar-nav">
        <NavLink to="/" end className={navClass}>
          Rankings
        </NavLink>
        <NavLink to="/people" className={navClass}>
          People
        </NavLink>
        <NavLink to="/log" className={navClass}>
          Log
        </NavLink>
        <button type="button" className="topbar-signout" onClick={() => signOut()} aria-label="Log out" title="Log out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
            <path d="M10 17l-5-5 5-5" />
            <path d="M5 12h11" />
          </svg>
        </button>
      </nav>
    </header>
  );
}
