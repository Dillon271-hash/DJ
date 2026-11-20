import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useEncoreStore } from "../lib/store";
import { spinsFor, tierFor } from "../lib/spins";
import { Vinyl, Wordmark } from "./Vinyl";
import { UserAvatar } from "./UserAvatar";
import { AccountSheet } from "./AccountSheet";
import { IconChart } from "./BottomNav";
import { useUnreadCount } from "../lib/activity";

export function Header() {
  const me = useEncoreStore((s) => s.session?.user.id ?? "");
  const username = useEncoreStore((s) => s.username);
  const [accountOpen, setAccountOpen] = useState(false);
  const unread = useUnreadCount();
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
        <Link to="/activity" className="topbar-bell" aria-label={unread ? `${unread} new notifications` : "Notifications"}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
            <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
          </svg>
          {unread > 0 && <span className="tab-badge">{unread > 9 ? "9+" : unread}</span>}
        </Link>
        <button type="button" className="topbar-account" onClick={() => setAccountOpen(true)} aria-label="Your account" title={username ? `@${username}` : "Your account"}>
          <UserAvatar id={me} name={username || "?"} size={34} />
        </button>
      </div>
      {accountOpen && <AccountSheet onClose={() => setAccountOpen(false)} />}
    </header>
  );
}
