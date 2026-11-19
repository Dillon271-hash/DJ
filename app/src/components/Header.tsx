import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useEncoreStore } from "../lib/store";
import { spinsFor, tierFor } from "../lib/spins";
import { Vinyl, Wordmark } from "./Vinyl";
import { UserAvatar } from "./UserAvatar";
import { AccountSheet } from "./AccountSheet";
import { IconChart } from "./BottomNav";

export function Header() {
  const me = useEncoreStore((s) => s.session?.user.id ?? "");
  const username = useEncoreStore((s) => s.username);
  const [accountOpen, setAccountOpen] = useState(false);
  const logs = useEncoreStore((s) => s.logs);
  const spins = spinsFor(logs);

  return (
    <header className="topbar">
      <NavLink to="/" className="topbar-brand" aria-label="Disko home">
        <Wordmark spinOnHover />
      </NavLink>
      <div className="topbar-nav">
        <Link to="/charts" className="spins-pill" title={`${tierFor(spins).tier.name} · ${spins} spins — see the Charts`}>
          <Vinyl size={16} />
          <b>{spins.toLocaleString()}</b>
          <span>spins</span>
          <span className="spins-pill-chart" aria-hidden="true">
            <IconChart />
          </span>
        </Link>
        <button type="button" className="topbar-account" onClick={() => setAccountOpen(true)} aria-label="Your account" title={username ? `@${username}` : "Your account"}>
          <UserAvatar id={me} name={username || "?"} size={34} />
        </button>
      </div>
      {accountOpen && <AccountSheet onClose={() => setAccountOpen(false)} />}
    </header>
  );
}
