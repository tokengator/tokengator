import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  entry: './src/index.ts',
  external: ['@libsql/client', 'discord.js', 'libsql'],
  format: 'esm',
  noExternal: [/@tokengator\/(?!db$).*/],
  outDir: './dist',
})
