import { Link } from "react-router-dom";
import { Vinyl } from "./Vinyl";

export function EmptyState() {
  return (
    <div className="empty-state">
      <Vinyl size={56} className="empty-record" />
      <h2 className="display" style={{ fontSize: "1.6rem", margin: "0 0 0.6rem" }}>
        No sets logged yet
      </h2>
      <p style={{ margin: "0 0 1.6rem" }}>
        Your ranked history starts with the next set you hear.
      </p>
      <Link to="/log" className="sticker-btn">
        Log your first set
      </Link>
    </div>
  );
}
