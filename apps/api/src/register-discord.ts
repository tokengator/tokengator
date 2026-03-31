import dotenv from 'dotenv'
import { resolve } from 'node:path'

dotenv.config({
  path: resolve(import.meta.dir, '../.env'),
  quiet: true,
})

const { registerDiscordCommands } = await import('@tokengator/discord')

await registerDiscordCommands()
