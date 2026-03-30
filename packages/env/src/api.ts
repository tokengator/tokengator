import 'dotenv/config'
import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

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

const envBooleanSchema = z
  .string()
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return true
    }

    const normalizedValue = value.trim().toLowerCase()

    return !['0', 'false', 'no', 'off'].includes(normalizedValue)
  })
  .pipe(z.boolean())

const solanaClusterSchema = z.enum(['devnet', 'localnet', 'mainnet', 'testnet'])

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_SOLANA_SIGN_IN_ENABLED: envBooleanSchema,
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGINS: corsOriginsSchema,
    DATABASE_AUTH_TOKEN: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    DISCORD_ADMIN_IDS: discordAdminIdsSchema,
    DISCORD_CLIENT_ID: z.string().min(1),
    DISCORD_CLIENT_SECRET: z.string().min(1),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    SOLANA_ADMIN_ADDRESSES: solanaAdminAddressesSchema,
    SOLANA_CLUSTER: solanaClusterSchema,
    SOLANA_ENDPOINT_PUBLIC: z.url(),
    WEB_URL: z.url().optional(),
  },
})
