import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { lookupDeezerImage } from './api/_lib/deezer.js'

// Mirrors api/artist-image.js (the Vercel serverless function used in
// production) so `npm run dev` has the same same-origin photo fallback
// locally, without needing the Vercel CLI.
function artistImageDevApi(): Plugin {
  return {
    name: 'artist-image-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/artist-image', async (req, res) => {
        const { searchParams } = new URL(req.url ?? '', 'http://localhost')
        const image = await lookupDeezerImage(searchParams.get('name') ?? '')
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ image }))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), artistImageDevApi()],
})
