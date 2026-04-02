import dotenv from 'dotenv'
import { resolve } from 'node:path'

dotenv.config({
  path: resolve(import.meta.dir, '../.env'),
  quiet: true,
})

const [{ createDiscordBotInviteUrl }, { env: discordEnv }] = await Promise.all([
  import('@tokengator/discord'),
  import('@tokengator/env/discord'),
])

console.info(createDiscordBotInviteUrl({ env: discordEnv }))
