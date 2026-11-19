import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { RankingsList } from "../components/RankingsList";
import { Loader } from "../components/Vinyl";
import { SpinsCard } from "../components/SpinsCard";
import { useEncoreStore } from "../lib/store";

export function Rankings() {
  const logs = useEncoreStore((s) => s.logs);
  const logsLoading = useEncoreStore((s) => s.logsLoading);
  const removeLog = useEncoreStore((s) => s.removeLog);

  if (logs.length === 0) return logsLoading ? <Loader label="Loading your rankings" /> : <EmptyState />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
        <div>
          <div className="eyebrow">Your rankings</div>
          <h1 className="display" style={{ fontSize: "1.9rem", margin: "0.3rem 0 0" }}>
            {logs.length} set{logs.length === 1 ? "" : "s"} logged
          </h1>
        </div>
        <Link to="/log" className="sticker-btn">
          + Log
        </Link>
      </div>

      <div style={{ marginTop: "1.2rem" }}>
        <SpinsCard logs={logs} />
      </div>

      <RankingsList logs={logs} onDelete={removeLog} />
    </div>
  );
}
