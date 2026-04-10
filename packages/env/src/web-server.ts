import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

const runtimeEnv = {
  API_URL: process.env.API_URL,
} as const

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv,
  server: {
    API_URL: z.url(),
  },
})
