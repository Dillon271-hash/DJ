import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { SPINS, spinsFor, tierFor } from "../lib/spins";
import type { SetLog } from "../lib/types";
import { Vinyl } from "./Vinyl";

// Your spins (points) and tier, with progress to the next tier.
export function SpinsCard({ logs, link = true }: { logs: SetLog[]; link?: boolean }) {
  const spins = spinsFor(logs);
  const { tier, next, progress } = tierFor(spins);
  const body = (
    <>
      <Vinyl size={44} className="spins-record" />
      <div className="spins-main">
        <div className="spins-top">
          <span className="spins-num">{spins.toLocaleString()}</span>
          <span className="spins-unit">spins</span>
          <span className="tier-chip">{tier.name}</span>
        </div>
        <div className="spins-bar" style={{ "--p": progress } as CSSProperties}>
          <span />
        </div>
        <div className="spins-next">
          {next ? `${(next.min - spins).toLocaleString()} to ${next.name}` : "Top tier — Legend status"}
          <span className="spins-hint"> · +{SPINS.perSet} a set, more for notes, photos &amp; new artists</span>
        </div>
      </div>
    </>
  );
  return link ? (
    <Link to="/charts" className="spins-card">
      {body}
    </Link>
  ) : (
    <div className="spins-card">{body}</div>
  );
}
