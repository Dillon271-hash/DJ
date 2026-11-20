import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEncoreStore } from "../lib/store";
import { fetchArtistImage } from "../lib/artistImage";
import { fetchArtistBio } from "../lib/artistBio";
import { ScorePill } from "../components/ScorePill";
import { Loader } from "../components/Vinyl";
import { genresOf } from "../lib/genres";
import { similarArtists } from "../lib/recommend";
import { ArtistPhoto } from "../components/ArtistPhoto";
import { useCommunityScores } from "../lib/community";
import { ScoreTrio } from "../components/ScoreTrio";
import { CommunitySection } from "../components/CommunitySection";
import { BreakdownSheet } from "../components/BreakdownSheet";
import { ComboPanel } from "../components/ComboPanel";
import { Doodle } from "../components/Doodle";

export function ArtistPage() {
  const { name } = useParams();
  const artist = decodeURIComponent(name ?? "").trim();
  const navigate = useNavigate();

  const logs = useEncoreStore((s) => s.logs);
  const artistLogs = useMemo(
    () =>
      [...logs]
        .filter((l) => l.artist.trim().toLowerCase() === artist.toLowerCase())
        .sort((a, b) => b.score - a.score),
    [logs, artist],
  );

  const { items, summary, loading } = useCommunityScores("artist", artist);
  const [breakdown, setBreakdown] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    let stale = false;
    setImage(null);
    setImageLoading(true);
    fetchArtistImage(artist).then((url) => {
      // A stale run (e.g. React StrictMode's double-invoke in dev, or a
      // fast artist-to-artist navigation) can still resolve after its
      // cleanup — only the current run gets to touch state, so it can't
      // flip the loading gate off early or paint the wrong artist's
      // photo. The lookup itself isn't cancelled: it's shared and cached,
      // so letting it finish means the remount gets it for free.
      if (stale) return;
      setImage(url);
      setImageLoading(false);
    });
    return () => {
      stale = true;
    };
  }, [artist]);

  // Bio coverage is much spottier than photo coverage (plenty of working
  // DJs have no Wikipedia article at all), so unlike the photo this
  // doesn't gate the page — it just fills in whenever/if it resolves.
  const [bio, setBio] = useState<string | null>(null);

  useEffect(() => {
    let stale = false;
    setBio(null);
    fetchArtistBio(artist).then((text) => {
      if (!stale) setBio(text);
    });
    return () => {
      stale = true;
    };
  }, [artist]);

  const genres = genresOf(artist);
  const similar = similarArtists(artist, 10);

  if (imageLoading) {
    return <Loader label={`Loading ${artist}`} />;
  }

  const count = artistLogs.length;
  const avg = count ? artistLogs.reduce((sum, l) => sum + l.score, 0) / count : null;
  const best = count ? artistLogs[0].score : null;

  return (
    <div>
      <button className="artist-back" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="artist-hero">
        <div className="artist-avatar">
          {image ? (
            <img src={image} alt={artist} decoding="async" referrerPolicy="no-referrer" onError={() => setImage(null)} />
          ) : (
            <span className="initials">{initials(artist)}</span>
          )}
        </div>
        <h1 className="display artist-name">{artist}</h1>
      </div>

      {genres.length > 0 && (
        <div className="artist-genres">
          {genres.map((g) => (
            <span key={g} className="genre-pill">
              {g}
            </span>
          ))}
        </div>
      )}

      {bio && <p className="artist-bio">{bio}</p>}

      <ScoreTrio summary={summary} loading={loading} />

      <button type="button" className="breakdown-btn" onClick={() => setBreakdown(true)} disabled={!items}>
        <Doodle kind="venue" size={62} />
        <span>
          <b>Ratings at a venue</b>
          <small>{items ? `${new Set(items.map((i) => i.log.event.split(",")[0].trim().toLowerCase())).size} venues rated` : "Loading…"}</small>
        </span>
        <span className="chevron" aria-hidden="true">›</span>
      </button>
      {breakdown && items && (
        <BreakdownSheet kind="artist" subject={artist} items={items} onPick={setPick} onClose={() => setBreakdown(false)} />
      )}
      {pick && items && <ComboPanel artist={artist} venue={pick} items={items} onClear={() => setPick(null)} />}

      {count > 0 ? (
        <div className="artist-stats">
          <div className="stat">
            <b>{count}</b>
            <span>Set{count === 1 ? "" : "s"} logged</span>
          </div>
          <div className="stat">
            <b>{avg!.toFixed(1)}</b>
            <span>Avg score</span>
          </div>
          <div className="stat">
            <b>{best!.toFixed(1)}</b>
            <span>Best</span>
          </div>
        </div>
      ) : (
        <p style={{ textAlign: "center", color: "var(--smoke)" }}>
          You haven't logged a set by {artist} yet.
        </p>
      )}

      <button
        className="sticker-btn"
        style={{ width: "100%" }}
        onClick={() => navigate(`/log/${encodeURIComponent(artist)}`)}
      >
        Log a set by {artist}
      </button>

      {items && <CommunitySection items={items} kind="artist" />}

      {similar.length > 0 && (
        <section style={{ marginTop: "1.8rem" }}>
          <div className="section-label">If you like {artist}</div>
          <div className="similar-row">
            {similar.map((s) => (
              <Link key={s.artist} to={`/artist/${encodeURIComponent(s.artist)}`} className="similar-card">
                <ArtistPhoto name={s.artist} size={72} />
                <span>{s.artist}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {count > 0 && (
        <>
          <hr className="perf" style={{ margin: "1.8rem 0 0.6rem" }} />
          <div className="eyebrow" style={{ margin: "0 0 0.4rem" }}>
            Sets you've logged
          </div>
          <div>
            {artistLogs.map((log) => (
              <Link key={log.id} to={`/set/${log.id}`} className="rank-row">
                <div className="info">
                  <div className="who">{log.event}</div>
                  <div className="meta">{formatDate(log.date)}</div>
                </div>
                <ScorePill score={log.score} bucket={log.bucket} />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}


function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
