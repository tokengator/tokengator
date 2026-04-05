import { createEnv } from '@t3-oss/env-core'
import dotenv from 'dotenv'
import { z } from 'zod'

import { logDebugCategoriesSchema } from './lib/log-debug-categories'
import { createEnvBooleanSchema } from './lib/server-env-boolean'

dotenv.config({
  quiet: true,
})

const envBooleanSchema = createEnvBooleanSchema(true)

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    BETTER_AUTH_URL: z.url(),
    DISCORD_BOT_START: envBooleanSchema,
    DISCORD_BOT_TOKEN: z.string().min(1).optional(),
    DISCORD_CLIENT_ID: z.string().min(1).optional(),
    DISCORD_GUILD_ID: z.string().min(1).optional(),
    LOG_DEBUG_CATEGORIES: logDebugCategoriesSchema,
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    WEB_URL: z.url().optional(),
  },
})

export type DiscordEnv = typeof env
