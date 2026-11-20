import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchCrew, inviteToCrew, leaveCrew, useSocial, SocialSetupError, type CrewDetail, type FeedItem } from "../lib/social";
import { useEncoreStore } from "../lib/store";
import { sortLogs, bucketForScore } from "../lib/ranking";
import { spinsFor } from "../lib/spins";
import { formatShortDate } from "../lib/dates";
import type { Bucket } from "../lib/types";
import { Busy, Loader } from "../components/Vinyl";
import { CrewBadge } from "../components/CrewBadge";
import { UserAvatar } from "../components/UserAvatar";
import { AvatarThumb } from "../components/AvatarThumb";
import { ScoreRing } from "../components/ScoreRing";
import { FeedCard } from "../components/FeedCard";
import { BucketFilter } from "../components/BucketFilter";
import { PeoplePicker, useToggleSet } from "../components/PeoplePicker";
import { crewTint } from "./Crews";
import { Sheet } from "../components/Sheet";
import { crewPhotoUrl, removeCrewPhoto, setCrewPhoto } from "../lib/crewPhotos";
import { PhotoPickBadge } from "../components/PhotoPickBadge";

type Tab = "sets" | "artists" | "latest";
type Filter = "all" | Bucket;

export function CrewPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const me = useEncoreStore((s) => s.session?.user.id ?? "");
  const [crew, setCrew] = useState<CrewDetail | null | undefined>(undefined);
  const [error, setError] = useState<"setup" | "other" | null>(null);
  const [tab, setTab] = useState<Tab>("sets");
  const [filter, setFilter] = useState<Filter>("all");
  const [inviting, setInviting] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  async function changePhoto(file: File) {
    if (!crew) return;
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      const path = await setCrewPhoto(crew.id, file, crew.photoPath);
      setCrew({ ...crew, photoPath: path });
      useSocial.getState().refresh();
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setPhotoBusy(false);
    }
  }

  const load = useCallback(() => {
    let stale = false;
    fetchCrew(id)
      .then((c) => !stale && setCrew(c))
      .catch((e) => {
        if (stale) return;
        console.error("[crew] load failed:", e);
        setError(e instanceof SocialSetupError ? "setup" : "other");
      });
    return () => {
      stale = true;
    };
  }, [id]);

  useEffect(() => {
    setCrew(undefined);
    return load();
  }, [load]);

  const names = useMemo(() => new Map(crew?.members.map((m) => [m.id, m.name]) ?? []), [crew]);

  const sets = useMemo(() => {
    if (!crew) return [];
    const sorted = sortLogs(crew.logs) as CrewDetail["logs"];
    return filter === "all" ? sorted : sorted.filter((l) => l.bucket === filter);
  }, [crew, filter]);

  // The crew's consensus: every artist anyone in the crew has logged, by
  // the average of everyone's scores.
  const artistsAll = useMemo(() => {
    if (!crew) return [];
    const by = new Map<string, { name: string; scores: number[]; who: Set<string> }>();
    for (const l of crew.logs) {
      const k = l.artist.trim().toLowerCase();
      const e = by.get(k) ?? { name: l.artist, scores: [], who: new Set<string>() };
      e.scores.push(l.score);
      e.who.add(l.userId);
      by.set(k, e);
    }
    return [...by.values()]
      .map((e) => ({ ...e, avg: e.scores.reduce((a, b) => a + b, 0) / e.scores.length }))
      .sort((a, b) => b.avg - a.avg || b.scores.length - a.scores.length);
  }, [crew]);

  const artists = useMemo(
    () => (filter === "all" ? artistsAll : artistsAll.filter((e) => bucketForScore(e.avg) === filter)),
    [artistsAll, filter],
  );

  const crewCounts = useMemo(() => {
    const items = tab === "artists" ? artistsAll.map((a) => bucketForScore(a.avg)) : (crew?.logs ?? []).map((l) => l.bucket);
    return {
      all: items.length,
      loved: items.filter((b) => b === "loved").length,
      good: items.filter((b) => b === "good").length,
      not: items.filter((b) => b === "not").length,
    };
  }, [tab, crew, artistsAll]);

  const memberSpins = useMemo(() => {
    if (!crew) return [];
    return crew.members
      .map((m) => ({ ...m, spins: spinsFor(crew.logs.filter((l) => l.userId === m.id)) }))
      .sort((a, b) => b.spins - a.spins);
  }, [crew]);

  if (error) {
    return (
      <div className="empty-state">
        <p>{error === "setup" ? "Re-run supabase/schema.sql in Supabase to turn on crews." : "Couldn't load this crew — check your connection."}</p>
        <button className="ghost-btn" onClick={() => navigate("/crews")}>
          Back to crews
        </button>
      </div>
    );
  }
  if (crew === undefined) return <Loader label="Loading crew" />;
  if (crew === null) {
    return (
      <div className="empty-state">
        <p>This crew doesn't exist anymore.</p>
        <button className="ghost-btn" onClick={() => navigate("/crews")}>
          Back to crews
        </button>
      </div>
    );
  }

  const isMember = crew.members.some((m) => m.id === me);
  const latest: FeedItem[] = crew.logs.slice(0, 30).map((log) => ({ log, person: { id: log.userId, name: names.get(log.userId) ?? "Disko user" } }));

  return (
    <div>
      <button className="artist-back" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="crew-hero" style={crewTint(crew.color)}>
        {isMember ? (
          <PhotoPickBadge
            name={crew.name}
            color={crew.color}
            size={104}
            photoUrl={crewPhotoUrl(crew.photoPath)}
            busy={photoBusy}
            onPick={changePhoto}
            label={crew.photoPath ? "Change crew photo" : "Add a crew photo"}
            spinning
          />
        ) : (
          <CrewBadge name={crew.name} color={crew.color} size={104} photoUrl={crewPhotoUrl(crew.photoPath)} />
        )}
        {photoError && <p className="flow-error" style={{ margin: 0 }}>{photoError}</p>}
        {isMember && crew.photoPath && !photoBusy && (
          <button
            type="button"
            className="text-btn"
            onClick={async () => {
              await removeCrewPhoto(crew.id, crew.photoPath);
              setCrew({ ...crew, photoPath: null });
              useSocial.getState().refresh();
            }}
          >
            Remove photo
          </button>
        )}
        <h1 className="display crew-hero-name">{crew.name}</h1>
        <div className="crew-hero-stats">
          <span>
            <b>{crew.spins.toLocaleString()}</b> spins
          </span>
          {crew.rank && (
            <Link to="/charts?board=crews">
              <b>#{crew.rank}</b> on the Charts
            </Link>
          )}
          <span>
            <b>{crew.logs.length}</b> set{crew.logs.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <section>
        <div className="section-label">
          Lineup <span className="muted">{crew.members.length}</span>
        </div>
        <div className="lineup">
          {memberSpins.map((m, i) => (
            <Link key={m.id} to={m.id === me ? "/rankings" : `/u/${m.id}`} className="lineup-row">
              <span className="lineup-pos">{i + 1}</span>
              <UserAvatar id={m.id} name={m.name} size={34} />
              <span className="lineup-name">
                {m.name}
                {m.id === me && <small> (you)</small>}
              </span>
              <span className="lineup-spins">{m.spins.toLocaleString()}</span>
            </Link>
          ))}
          {crew.invited.map((m) => (
            <div key={m.id} className="lineup-row invited">
              <span className="lineup-pos">·</span>
              <UserAvatar id={m.id} name={m.name} size={34} />
              <span className="lineup-name">{m.name}</span>
              <span className="lineup-spins">Invited</span>
            </div>
          ))}
        </div>
        {isMember && (
          <div className="crew-actions">
            <button type="button" className="sticker-btn" onClick={() => setInviting(true)}>
              + Invite
            </button>
            {confirmLeave ? (
              <button
                type="button"
                className="ghost-btn danger"
                onClick={async () => {
                  await leaveCrew(crew.id);
                  navigate("/crews");
                }}
              >
                Leave {crew.name}?
              </button>
            ) : (
              <button type="button" className="ghost-btn" onClick={() => setConfirmLeave(true)}>
                Leave crew
              </button>
            )}
          </div>
        )}
      </section>

      <div className="seg seg-wide" style={{ marginTop: "1.8rem" }}>
        <button type="button" className={tab === "sets" ? "on" : ""} onClick={() => setTab("sets")}>
          Crew sets
        </button>
        <button type="button" className={tab === "artists" ? "on" : ""} onClick={() => setTab("artists")}>
          Artists
        </button>
        <button type="button" className={tab === "latest" ? "on" : ""} onClick={() => setTab("latest")}>
          Latest
        </button>
      </div>

      {tab !== "latest" && (
        <BucketFilter value={filter} onChange={setFilter} counts={crewCounts} />
      )}

      {crew.logs.length === 0 ? (
        <p className="hint" style={{ marginTop: "1rem" }}>
          No one in {crew.name} has logged a set yet.
        </p>
      ) : tab === "sets" ? (
        sets.length === 0 ? (
          <p className="hint">No sets in this bucket yet.</p>
        ) : (
          sets.map((log, i) => (
            <Link key={log.id} to={`/set/${log.id}`} className="rank-row rank-row-standalone">
              <AvatarThumb name={log.artist} />
              <div className="info">
                <div className="title-line">
                  <span className="num">{i + 1}.</span>
                  <span className="who">{log.artist}</span>
                </div>
                <div className="meta crew-meta">
                  <UserAvatar id={log.userId} name={names.get(log.userId) ?? "?"} size={16} />
                  {(names.get(log.userId) ?? "Disko user").split(/\s+/)[0]} · {log.event} · {formatShortDate(log.date)}
                </div>
              </div>
              <ScoreRing score={log.score} bucket={log.bucket} />
            </Link>
          ))
        )
      ) : tab === "artists" ? (
        artists.length === 0 ? (
          <p className="hint">No artists in this bucket yet.</p>
        ) : (
          artists.map((a, i) => (
            <Link key={a.name} to={`/artist/${encodeURIComponent(a.name)}`} className="rank-row rank-row-standalone">
              <AvatarThumb name={a.name} />
              <div className="info">
                <div className="title-line">
                  <span className="num">{i + 1}.</span>
                  <span className="who">{a.name}</span>
                </div>
                <div className="meta crew-meta">
                  <span className="avatar-stack tiny">
                    {[...a.who].slice(0, 4).map((uid) => (
                      <UserAvatar key={uid} id={uid} name={names.get(uid) ?? "?"} size={16} />
                    ))}
                  </span>
                  {a.who.size} saw it · {a.scores.length} set{a.scores.length === 1 ? "" : "s"}
                </div>
              </div>
              <ScoreRing score={a.avg} bucket={bucketForScore(a.avg)} />
            </Link>
          ))
        )
      ) : (
        latest.map((item) => <FeedCard key={item.log.id} item={item} />)
      )}

      {inviting && (
        <InviteSheet
          crew={crew}
          onClose={() => setInviting(false)}
          onSent={() => {
            setInviting(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function InviteSheet({ crew, onClose, onSent }: { crew: CrewDetail; onClose: () => void; onSent: () => void }) {
  const [picked, toggle] = useToggleSet();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setSending(true);
    setError(null);
    try {
      await inviteToCrew(crew.id, [...picked]);
      onSent();
    } catch (e) {
      console.error("[crew] invite failed:", e);
      setError("Couldn't send those invites — try again.");
      setSending(false);
    }
  }

  return (
    <Sheet onClose={onClose} label={`Invite to ${crew.name}`}>
      <div className="new-crew-preview">
        <CrewBadge name={crew.name} color={crew.color} size={64} photoUrl={crewPhotoUrl(crew.photoPath)} />
      </div>
      <h2 className="display sheet-title">Invite to {crew.name}</h2>
      <PeoplePicker picked={picked} onToggle={toggle} exclude={[...crew.members, ...crew.invited]} />
      {error && <p className="flow-error">{error}</p>}
      <div className="sheet-actions">
        <button type="button" className="ghost-btn" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="sticker-btn" disabled={picked.size === 0 || sending} onClick={send}>
          {sending ? <Busy>Sending…</Busy> : `Invite${picked.size ? ` ${picked.size}` : ""}`}
        </button>
      </div>
    </Sheet>
  );
}
