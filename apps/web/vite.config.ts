import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

const target = process.env.VITE_API_URL ?? 'http://localhost:3000'

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 600,
  },
  plugins: [tsconfigPaths(), tailwindcss(), tanstackStart(), viteReact()],
  server: {
    port: 3001,
    proxy: {
      '/api': { changeOrigin: true, target },
      '/rpc': { changeOrigin: true, target },
    },
  },
})
