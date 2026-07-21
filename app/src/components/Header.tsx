import { NavLink } from "react-router-dom";
import { useEncoreStore } from "../lib/store";

export function Header() {
  const signOut = useEncoreStore((s) => s.signOut);

  return (
    <header className="topbar">
      <NavLink to="/" className="topbar-brand display">
        <span className="mark" aria-hidden="true" />
        Encore
      </NavLink>
      <nav className="topbar-nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="label">Rankings</span>
        </NavLink>
        <NavLink to="/log" className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="label">Log a set</span>
        </NavLink>
        <button type="button" className="topbar-signout" onClick={() => signOut()}>
          Log out
        </button>
      </nav>
    </header>
  );
}
