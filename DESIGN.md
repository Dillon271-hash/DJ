# Encore — a Beli for DJ sets

## Concept

Beli turned "where should we eat" into a daily habit: log the meal, compare it
against your last ten, watch your personal list reorder itself. **Encore**
applies the same loop to nightlife — every DJ set you experience (a festival
main stage, a 3am basement b2b, a livestream) becomes an entry in your
personal, ranked history. Scores aren't picked from a star scale; they're
*earned* through head-to-head comparisons against sets you've already logged,
exactly like Beli's restaurant ranking.

## The loop

1. **Log** — tag the artist (or artists, for a b2b), venue/festival, date, stage.
2. **Bucket** — coarse first call: Loved it / It was good / Not for me.
3. **Compare** — a short run of "which was better" match-ups against sets
   you've already logged in that bucket.
4. **Rank** — Encore binary-searches the new set into your all-time list and
   derives a precise 0.0–10.0 score from its position.
5. **Compare-out** — see it against friends' rankings, the artist's global
   average, and your city's leaderboard.

### Beli → Encore glossary

| Beli | Encore |
|---|---|
| Restaurant | **Set** — an artist's performance at a specific event |
| Visit | **Log** — a set you personally heard, live or streamed |
| Want to Try | **Want to Hear** — artists/festivals on your radar |
| Foodie Score | **Encore Score** — your taste-graph reliability rating |
| Cuisine tags | Genre / BPM / label tags |
| City rankings | City & festival rankings |
| Reservation booking | Ticket links (via partner APIs) |

## Core features

- **Comparative rating engine** — bucket + pairwise comparisons produce a
  defensible 0–10 score, no arbitrary stars.
- **Personal rankings** — full set history, always sorted, filterable by
  genre, city, year, venue.
- **Friends feed** — see what your crew logged after a festival weekend.
- **Leaderboards** — global, friends-only, city, and genre, for artists,
  venues, and festivals.
- **Artist & venue pages** — aggregate scores, set history, upcoming dates,
  claimable profiles for DJs and promoters.
- **Want to Hear** — a watchlist for artists/festivals with reminders when
  they're playing near you.
- **Recs engine** — "sets you'd rank highly" from your taste graph and
  friends with similar rankings.
- **Lists** — user-built, followable collections ("Best B2Bs of 2025").
- **Check-in** — geo-tagged live check-ins at festivals and clubs.
- **Stats & badges** — cities danced in, genres explored, festivals
  attended, longest streak.

## Data model

| Entity | Key fields |
|---|---|
| **User** | id, handle, avatar, home_city, encore_score, genre_affinity[] |
| **Artist** | id, name, aliases[], genres[], claimed_by |
| **Venue** | id, name, city, geo, type (club / festival / stream) |
| **Event** | id, venue_id, date, name |
| **Set** | id, event_id, artist_ids[] (b2b support), stage, start_time |
| **Log** | id, user_id, set_id, bucket, score, note, photo, checked_in |
| **List** | id, owner_id, title, set_ids[], followers[] |

A **Set** is the join of one or more artists and an event slot; a **Log** is
one user's personal experience and rating of that set.

## Ranking algorithm

Same mechanism Beli uses for restaurants — the score is a byproduct of rank
position, not the other way around.

1. **Bucket the set** — Loved it / It was good / Not for me. This picks the
   band of the list (e.g. "Loved it" ≈ 7.0–10.0) that later comparisons only
   need to search within.
2. **Binary-search via match-ups** — 2–4 "which was better" prompts against
   sets already in that band, halving the search space each time.
3. **Convert position to score** — rank position within the band maps to a
   0.0–10.0 score via a fixed curve, so "3rd best set you've ever loved"
   becomes ~8.9.
4. **Re-rank on every new log** — new logs only insert, never require
   re-comparing your whole history, keeping it a 15-second habit.
5. **Roll up to Artist/Venue scores** — a recency-weighted mean of every
   user's per-set score, so one legendary set doesn't dominate forever.

## Brand direction

Nightlife reference points, not food-app pastel: a near-black canvas, one hot
accent for action, one warm accent reserved for the score itself — like two
colors of stage lighting gel. Numerals get the loudest voice on the page.

- **Palette** — Void `#0A0A10` (bg), Ink `#17161F` (surface), Pulse `#FF2E63`
  (primary accent), Amber `#FFB13B` (score/secondary accent), Smoke
  `#79778C` (muted text), Bone `#ECE9F3` (foreground text).
- **Type** — heavy uppercase grotesk for wordmark/section titles/score
  numerals; a humanist sans for body copy; monospace for timestamps, scores,
  and stat labels (reads like a ticket stub or setlist log).
- **Motif** — a waveform bar as the recurring section divider, tying every
  screen back to audio.

Full visual mockups (phone screens for feed, rate flow, set detail, profile,
leaderboard) and the interactive spec: see the published design artifact
linked in the PR/commit this file ships with.

## Suggested tech stack (web MVP)

- **Client** — React + TypeScript (Vite), mobile-first responsive SPA.
- **State** — TanStack Query (server cache) + Zustand (in-progress rating flow).
- **Backend** — Node (Fastify) + PostgreSQL, matching the relational
  User/Artist/Venue/Event/Set/Log graph.
- **Ranking service** — a small dedicated service owning the bucket +
  binary-insertion logic per user, tunable independent of the API.
- **Auth** — email + Apple/Google OAuth.
- **Data ingestion** — seed Artist/Event records from a ticketing/listings
  API (Songkick, Bandsintown, or a DICE-style partner) so logging is a
  search, not free text entry.

## Roadmap

**Phase 1 — MVP (solo loop)**
- Log a set, bucket + compare rating flow
- Personal ranked list, set detail page
- Basic artist/venue pages (auto-created from logs)

**Phase 2 — Social**
- Follow graph, friends feed, comments/reactions
- City / genre / global leaderboards
- Want to Hear watchlist, Lists & collections

**Phase 3 — Scale**
- Recs engine from the taste graph
- Geo check-ins at live events, claimed artist/promoter profiles
- Ticketing partner integration, native iOS/Android apps
