import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { env } from '@tokengator/env/web-server'

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 600,
  },
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    allowedHosts: env.VITE_SERVER_ALLOWED_HOSTS,
    host: env.VITE_SERVER_HOST,
    port: env.VITE_SERVER_PORT,
    proxy: {
      '/api': { changeOrigin: true, target: env.API_URL },
      '/rpc': { changeOrigin: true, target: env.API_URL },
    },
  },
})
