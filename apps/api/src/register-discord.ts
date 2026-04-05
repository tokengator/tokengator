import dotenv from 'dotenv'
import { resolve } from 'node:path'
import { configureAppLogger } from '@tokengator/logger'

dotenv.config({
  path: resolve(import.meta.dir, '../.env'),
  quiet: true,
})

const { env } = await import('@tokengator/env/discord')

configureAppLogger({ env })

const { registerDiscordCommands } = await import('@tokengator/discord')

await registerDiscordCommands({ env })
