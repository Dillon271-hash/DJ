# Encore

A Beli-style ranked diary for DJ sets — log a set you heard, rate it, and
build a personal ranking of every artist and venue over time. See
[`../DESIGN.md`](../DESIGN.md) for the original product/brand spec.

## What it does

- **Search-first logging.** Type an artist's name (autocompletes against a
  seed list of 300+ touring DJs/producers, or search anything of your own),
  pick a venue/festival, and log a set.
- **Beli-style rating flow, one full-screen step at a time.** Where & when
  (every listed club and festival shows up front, plus your own venues) →
  a bucket (*Loved it / It was good / Not for me*) → a few "which was
  better" photo face-offs against sets you've already logged in that
  bucket, to settle its exact score → the same bucket + face-off for the
  venue → who you were with (tag other Encore users or type any name),
  notes, photos/videos → an animated score reveal. Logging several DJs
  from one festival visit skips the venue steps after the first.
- **Rankings.** Browse everything you've logged, sorted within each bucket
  by score, with a "Sets" / "Venues" toggle — the venues view aggregates
  every set you've logged there into an average score and rank.
- **Artist and venue pages.** Each artist gets a page with their photo
  (fetched from Spotify), your stats (sets logged / avg score / best), and
  every set you've logged by them. Venues get the same, minus the photo.
- **Real accounts.** Sign up with an email/password, log in from any
  device, and your logged sets live in a real database (Supabase) instead
  of just your browser's localStorage.

## Develop

```
npm install
npm run dev
```

The app **won't run at all** without Supabase set up — see **Environment
variables** below, it's required, not optional (unlike the Spotify photo
lookup, which just degrades to showing initials if it's missing).

## Build

```
npm run build
```

## Environment variables

Copy `.env.example` to `.env` and fill in:

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

**Spotify** (artist photos, optional): get these from an app you create at
[developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
— open the app's Settings to reveal them. Used server-side only (Client
Credentials flow), never exposed to the browser.

**Supabase** (accounts + database, required): create a free project at
[supabase.com/dashboard](https://supabase.com/dashboard), then:
1. Open the project's **Settings → Data API** page and copy the **Project
   URL** into `VITE_SUPABASE_URL`, and the **anon public** key into
   `VITE_SUPABASE_ANON_KEY`. (This key is meant to be public — see the
   comment in `src/lib/supabase.ts` for why that's safe.)
2. Open the **SQL Editor**, paste in the entire contents of
   `supabase/schema.sql`, and run it once. This creates the `logs` table
   and the security rules that keep each user's data private to them.
3. Restart `npm run dev` after saving `.env` — Vite only reads it on
   startup.
4. Under **Authentication → URL Configuration**, set **Site URL** to the
   deployed app's address and add every address the app runs at
   (deployed and `http://localhost:5173/**`) under **Redirect URLs**.
   Sign-up confirmation and password-reset emails link back there.
5. Optional: paste the branded templates in `supabase/email-templates/`
   into **Authentication → Emails** ("Confirm signup" and "Reset
   password" tabs).

If deploying to Vercel, add all four as Environment Variables in the
project settings there too.

Note that Supabase's built-in email sender (used until you configure
custom SMTP under Authentication → Emails → SMTP Settings) only delivers
to members of your Supabase team and only a few per hour — fine for
testing, but other people won't receive sign-up or reset emails.

## Structure

- `src/lib/types.ts` — core data shapes (`SetLog`, `Bucket`, …)
- `src/lib/ranking.ts` — the bucket + binary-insertion comparison scoring
  algorithm, generic over both artist sets and venues
- `src/lib/supabase.ts` — the Supabase client (`null` if env vars are
  missing, checked via `isSupabaseConfigured`)
- `src/lib/store.ts` — Zustand store: auth state (`session`, `signUp`,
  `signIn`, `signOut`) and `logs`, both backed by Supabase — no
  `localStorage` persistence anymore, everything round-trips through the
  database
- `src/lib/artists.ts` — seed list of 300+ DJs for search autocomplete
- `src/lib/venues.ts` — seed list of well-known nightclubs/festivals for
  venue autocomplete (global, not location-biased — DJ sets happen
  everywhere); anything not listed can still be typed in freely
- `src/lib/artistImage.ts` — client-side helper that calls the
  `/api/artist-image` proxy below
- `src/pages/`
  - `Welcome.tsx` — sign-up / log-in screen, shown whenever there's no
    session
  - `Rankings.tsx` — home page, Sets/Venues toggle + bucket filters
  - `LogSet.tsx` — search-first artist entry screen; picking an artist
    starts the log flow
  - `LogFlow.tsx` — the full-screen step-by-step log flow (`/log/:artist`)
  - `ArtistPage.tsx` — artist profile: photo, bio, stats, past sets
  - `VenuePage.tsx` — same idea for venues (photo from Wikipedia when
    there's a confident match)
  - `SetDetail.tsx` — a single logged set
- `src/components/`
  - `BucketPicker.tsx` — the branded Loved it / It was good / Not for me
    cards
  - `ComparePicker.tsx` — the animated photo face-off that runs the
    comparison scoring (with Too close to call / Undo / Skip)
  - `VenuePicker.tsx` — the browsable, searchable club/festival list
  - `WithWhoInput.tsx` — "who were you with", with an Encore-user popup
  - `ScoreRing.tsx` / `ScorePill.tsx` — score display
  - `RowMenu.tsx` — the "⋯" delete menu on ranking rows
  - `AvatarThumb.tsx` — auto-loading artist thumbnail
- `src/index.css` — design tokens and component styles
- `supabase/schema.sql` — the `logs` and `profiles` tables, Storage
  bucket, and Row Level Security policies. Safe to re-run; re-run it in
  your Supabase project's SQL Editor whenever it changes
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
- **Email confirmation on sign-up** is controlled by your Supabase
  project's Auth settings, not by this app's code. With it on (the
  default for new projects), `signUp()` doesn't return a session — the
  Welcome screen shows a "check your email" message instead, and the
  account isn't usable until they click the link. Turn it off in
  Authentication → Sign In / Providers → Email if you'd rather sign-up be
  instant, at the cost of not verifying the address is real.
