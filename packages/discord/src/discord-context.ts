import type { Database } from '@tokengator/db'
import type { DiscordEnv } from '@tokengator/env/discord'

export interface DiscordContext {
  db: Database
  env: DiscordEnv
}
