import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { lookupSpotifyImage } from './api/_lib/spotify.js'

// Mirrors api/artist-image.js (the Vercel serverless function used in
// production) so `npm run dev` has the same same-origin photo fallback
// locally, without needing the Vercel CLI.
function artistImageDevApi(): Plugin {
  return {
    name: 'artist-image-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/artist-image', async (req, res) => {
        const { searchParams } = new URL(req.url ?? '', 'http://localhost')
        const image = await lookupSpotifyImage(searchParams.get('name') ?? '')
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ image }))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env / .env.local into process.env for the dev-only API
  // middleware above — server-side code, so no VITE_ prefix needed.
  // Vercel injects the same two vars into process.env on its own.
  const env = loadEnv(mode, process.cwd(), '')
  process.env.SPOTIFY_CLIENT_ID ??= env.SPOTIFY_CLIENT_ID
  process.env.SPOTIFY_CLIENT_SECRET ??= env.SPOTIFY_CLIENT_SECRET

  return {
    plugins: [react(), artistImageDevApi()],
  }
})
