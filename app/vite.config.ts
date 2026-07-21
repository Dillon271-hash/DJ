import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { lookupSpotifyImage } from './api/_lib/spotify.js'
import { searchVenues } from './api/_lib/foursquare.js'

// Mirrors api/artist-image.js and api/venue-search.js (the Vercel
// serverless functions used in production) so `npm run dev` has the
// same same-origin API endpoints locally, without needing the Vercel
// CLI.
function devApiRoutes(): Plugin {
  return {
    name: 'dev-api-routes',
    configureServer(server) {
      server.middlewares.use('/api/artist-image', async (req, res) => {
        const { searchParams } = new URL(req.url ?? '', 'http://localhost')
        const image = await lookupSpotifyImage(searchParams.get('name') ?? '')
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ image }))
      })
      server.middlewares.use('/api/venue-search', async (req, res) => {
        const { searchParams } = new URL(req.url ?? '', 'http://localhost')
        const results = await searchVenues(searchParams.get('q') ?? '')
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ results }))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env / .env.local into process.env for the dev-only API
  // routes above — server-side code, so no VITE_ prefix needed.
  // Vercel injects the same vars into process.env on its own.
  const env = loadEnv(mode, process.cwd(), '')
  process.env.SPOTIFY_CLIENT_ID ??= env.SPOTIFY_CLIENT_ID
  process.env.SPOTIFY_CLIENT_SECRET ??= env.SPOTIFY_CLIENT_SECRET
  process.env.FOURSQUARE_API_KEY ??= env.FOURSQUARE_API_KEY

  return {
    plugins: [react(), devApiRoutes()],
  }
})
