import 'dotenv/config'
import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

import { logDebugCategoriesSchema } from './lib/log-debug-categories'
import { createEnvBooleanSchema } from './lib/server-env-boolean'
import { parseStringList } from './lib/server-env-list'

const corsOriginsSchema = z
  .string()
  .transform((value) =>
    [
      ...new Set(
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b)),
  )
  .pipe(z.array(z.url()).min(1))

const discordAdminIdsSchema = z
  .string()
  .optional()
  .transform(parseStringList)
  .pipe(z.array(z.string().min(1)))

const solanaAdminAddressesSchema = z
  .string()
  .optional()
  .transform(parseStringList)
  .pipe(z.array(z.string().min(1)))

const envBooleanSchema = createEnvBooleanSchema(true)

const heliusClusterSchema = z.enum(['devnet', 'mainnet'])
const positiveIntegerSchema = z.coerce.number().int().positive()
const solanaClusterSchema = z.enum(['devnet', 'localnet', 'mainnet', 'testnet'])

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    API_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_SOLANA_SIGN_IN_ENABLED: envBooleanSchema,
    CORS_ORIGINS: corsOriginsSchema,
    DATABASE_AUTH_TOKEN: z.string().min(1).optional(),
    DATABASE_URL: z.string().min(1),
    DISCORD_ADMIN_IDS: discordAdminIdsSchema,
    DISCORD_BOT_START: envBooleanSchema,
    DISCORD_BOT_TOKEN: z.string().min(1).optional(),
    DISCORD_CLIENT_ID: z.string().min(1),
    DISCORD_CLIENT_SECRET: z.string().min(1),
    DISCORD_GUILD_ID: z.string().min(1).optional(),
    HELIUS_API_KEY: z.string().min(1),
    HELIUS_CLUSTER: heliusClusterSchema,
    LOG_DEBUG_CATEGORIES: logDebugCategoriesSchema,
    LOG_JSON: envBooleanSchema,
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    SCHEDULED_DISCORD_SYNC_INTERVAL_MINUTES: positiveIntegerSchema.default(1),
    SCHEDULED_INDEX_INTERVAL_MINUTES: positiveIntegerSchema.default(30),
    SCHEDULED_MEMBERSHIP_SYNC_INTERVAL_MINUTES: positiveIntegerSchema.default(5),
    SCHEDULER_POLL_SECONDS: positiveIntegerSchema.default(60),
    SCHEDULER_START: envBooleanSchema,
    SOLANA_ADMIN_ADDRESSES: solanaAdminAddressesSchema,
    SOLANA_CLUSTER: solanaClusterSchema,
    SOLANA_ENDPOINT_PUBLIC: z.url(),
    WEB_URL: z.url().optional(),
  },
})
