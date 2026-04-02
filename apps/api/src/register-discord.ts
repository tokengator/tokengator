import dotenv from 'dotenv'
import { resolve } from 'node:path'

dotenv.config({
  path: resolve(import.meta.dir, '../.env'),
  quiet: true,
})

const [{ registerDiscordCommands }, { env: discordEnv }] = await Promise.all([
  import('@tokengator/discord'),
  import('@tokengator/env/discord'),
])

await registerDiscordCommands({ env: discordEnv })
