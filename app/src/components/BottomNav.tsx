import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useSocial } from "../lib/social";
import { useOpenInvites } from "../lib/tags";
import { Vinyl } from "./Vinyl";

// App-style tab bar. The centre "Log" tab is a record you drop the needle on.
export function BottomNav() {
    const invites = useSocial((s) => s.crews?.invites.length ?? 0);
  const tagged = useOpenInvites().length;
  const requests = useSocial((s) => s.plusOnes?.incoming.length ?? 0);

  return (
    <nav className="tabbar" aria-label="Main">
      <Tab to="/" end label="Feed" icon={<IconHome />} badge={tagged + requests} />
      <Tab to="/discover" label="Discover" icon={<IconCompass />} />
      <NavLink to="/log" className={({ isActive }) => `tab tab-log${isActive ? " active" : ""}`} aria-label="Log a set">
        <span className="tab-log-disc">
          <Vinyl size={50} />
          <span className="tab-log-plus" aria-hidden="true">
            +
          </span>
        </span>
        <span className="tab-label">Log</span>
      </NavLink>
      <Tab to="/rankings" label="Rankings" icon={<IconList />} />
      <Tab to="/crews" label="Crews" icon={<IconCrew />} badge={invites} />
    </nav>
  );
}

function Tab({ to, label, icon, badge = 0, end }: { to: string; label: string; icon: ReactNode; badge?: number; end?: boolean }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `tab${isActive ? " active" : ""}`}>
      <span className="tab-icon">
        {icon}
        {badge > 0 && (
          <span className="tab-badge" aria-label={`${badge} new`}>
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span className="tab-label">{label}</span>
    </NavLink>
  );
}

const svg = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

function IconList() {
  return (
    <svg {...svg}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1.2" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="4.5" cy="18" r="1.2" fill="currentColor" />
    </svg>
  );
}
function IconCrew() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
    </svg>
  );
}
function IconHome() {
  return (
    <svg {...svg}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v10h13V10" />
      <circle cx="12" cy="15" r="2.4" />
    </svg>
  );
}

function IconCompass() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </svg>
  );
}
export function IconChart() {
  return (
    <svg {...svg}>
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 3.4M17 6h2.5a2.5 2.5 0 0 1-2.6 3.4" />
    </svg>
  );
}
