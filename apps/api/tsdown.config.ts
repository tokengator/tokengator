import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  entry: './src/index.ts',
  external: ['discord.js'],
  format: 'esm',
  noExternal: [/@tokengator\/.*/],
  outDir: './dist',
})
