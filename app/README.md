# Encore

Phase 1 MVP of Encore — a Beli-style ranked diary for DJ sets. See
[`../DESIGN.md`](../DESIGN.md) for the full product and brand spec.

Log a set, give it a first-pass bucket (Loved it / It was good / Not for
me), settle its exact score with a few "which was better" comparisons
against sets you've already logged, then browse your personal ranking.
Everything persists to `localStorage` — there's no backend yet.

## Develop

```
npm install
npm run dev
```

## Build

```
npm run build
```

## Structure

- `src/lib/types.ts` — core data shapes (`SetLog`, `Bucket`, …)
- `src/lib/ranking.ts` — the bucket + binary-insertion scoring algorithm
- `src/lib/store.ts` — Zustand store, persisted to `localStorage`
- `src/pages/` — Rankings (home), LogAndRate (log + rate flow), SetDetail
- `src/index.css` — the Encore design tokens and component styles
