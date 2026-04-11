import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

const allowedHosts =
  process.env.VITE_SERVER_ALLOWED_HOSTS?.split(',')
    .map((value) => value.trim())
    .filter(Boolean) ?? []
const host = process.env.VITE_SERVER_HOST?.trim().toLowerCase() === 'true' ? true : undefined
const port = Number(process.env.VITE_SERVER_PORT ?? 3001)
const target = process.env.API_URL ?? 'http://localhost:3000'

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 600,
  },
  plugins: [tsconfigPaths(), tailwindcss(), tanstackStart(), viteReact()],
  server: {
    allowedHosts,
    host,
    port,
    proxy: {
      '/api': { changeOrigin: true, target },
      '/rpc': { changeOrigin: true, target },
    },
  },
})
