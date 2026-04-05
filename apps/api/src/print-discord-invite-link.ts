import dotenv from 'dotenv'
import { resolve } from 'node:path'

dotenv.config({
  path: resolve(import.meta.dir, '../.env'),
  quiet: true,
})

const { env } = await import('@tokengator/env/discord')

const { createDiscordBotInviteUrl } = await import('@tokengator/discord')
process.stdout.write(`${createDiscordBotInviteUrl({ env })}\n`)
