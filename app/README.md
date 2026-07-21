# Encore

A Beli-style ranked diary for DJ sets — log a set you heard, rate it, and
build a personal ranking of every artist and venue over time. See
[`../DESIGN.md`](../DESIGN.md) for the original product/brand spec.

## What it does

- **Search-first logging.** Type an artist's name (autocompletes against a
  seed list of 300+ touring DJs/producers, or search anything of your own),
  pick a venue/festival, and log a set.
- **Beli-style rating flow.** First a quick bucket — *Loved it / It was good
  / Not for me* — then a few "which was better" comparisons against sets
  you've already logged in that bucket settle its exact score. Venues get
  the same treatment: a separate bucket + comparison pass right after you
  rate the artist.
- **Rankings.** Browse everything you've logged, sorted within each bucket
  by score, with a "Sets" / "Venues" toggle — the venues view aggregates
  every set you've logged there into an average score and rank.
- **Artist and venue pages.** Each artist gets a page with their photo
  (fetched from Spotify), your stats (sets logged / avg score / best), and
  every set you've logged by them. Venues get the same, minus the photo.
- **Persists to `localStorage`.** No backend, no login — everything lives
  in your browser. Clearing site data wipes it.

## Develop

```
npm install
npm run dev
```

Artist photos need a free Spotify developer app — see **Environment
variables** below. Without it, artist pages just show initials instead of a
photo; nothing else breaks.

## Build

```
npm run build
```

## Environment variables

Copy `.env.example` to `.env` and fill in:

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

Get these from an app you create at
[developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
— open the app's Settings to reveal them. Used server-side only (Client
Credentials flow), never exposed to the browser. If deploying to Vercel,
add the same two as Environment Variables in the project settings there.

## Structure

- `src/lib/types.ts` — core data shapes (`SetLog`, `Bucket`, …)
- `src/lib/ranking.ts` — the bucket + binary-insertion comparison scoring
  algorithm, generic over both artist sets and venues
- `src/lib/store.ts` — Zustand store, persisted to `localStorage`
- `src/lib/artists.ts` — seed list of 300+ DJs for search autocomplete
- `src/lib/venues.ts` — seed list of well-known nightclubs/festivals for
  venue autocomplete (global, not location-biased — DJ sets happen
  everywhere); anything not listed can still be typed in freely
- `src/lib/artistImage.ts` — client-side helper that calls the
  `/api/artist-image` proxy below
- `src/pages/`
  - `Rankings.tsx` — home page, Sets/Venues toggle + bucket filters
  - `LogSet.tsx` — search-first artist entry screen
  - `ArtistPage.tsx` — artist profile: photo, stats, log-a-set form, past
    sets
  - `VenuePage.tsx` — same idea for venues, no photo
  - `SetDetail.tsx` — a single logged set
- `src/components/`
  - `RateSheet.tsx` — the bottom-sheet rating flow (bucket → compare →
    venue bucket → venue compare → done)
  - `VenueAutocomplete.tsx` — the venue/festival search field
  - `ScoreRing.tsx` / `ScorePill.tsx` — score display
  - `RowMenu.tsx` — the "⋯" delete menu on ranking rows
  - `AvatarThumb.tsx` — auto-loading artist thumbnail
- `src/index.css` — design tokens and component styles
- `api/artist-image.js` + `api/_lib/spotify.js` — Vercel serverless
  function that looks up an artist's Spotify photo server-side (keeps the
  client secret off the client). `vite.config.ts` mirrors this as dev
  middleware so `npm run dev` has the same endpoint locally without the
  Vercel CLI.

## Notes on decisions worth knowing before touching things

- **HashRouter, not BrowserRouter.** There's no backend to provide SPA
  fallback routing (e.g. on Vercel static hosting), so routes are
  `/#/artist/...` instead of `/artist/...`.
- **Venue search used to call Foursquare's Places API** and was removed —
  their search is inherently IP/radius-biased (max 100km), which can't
  surface a venue far from wherever the server's request originates (e.g.
  searching a Miami festival from a Florida home IP still failed). Swapped
  for the curated `venues.ts` list instead, same pattern as the artist
  seed list.
- **Artist photos come from Spotify**, not Deezer (blocked by CORS with no
  server-visible workaround) or a generic web image search (produced
  wrong-person matches, e.g. resolving "Fisher" to an unrelated 1950s
  singer). Spotify's Client Credentials flow is app-only auth — no user
  login required, just the two env vars above.
