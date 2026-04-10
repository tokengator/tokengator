import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

const runtimeEnv = {
  API_URL: process.env.API_URL,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
} as const

const serverEnv = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv,
  server: {
    API_URL: z.url().optional(),
    BETTER_AUTH_URL: z.url(),
  },
})

export const env = {
  API_URL: serverEnv.API_URL ?? serverEnv.BETTER_AUTH_URL,
} as const
