import { siwsClient } from 'better-auth-solana/client'
import { adminClient, organizationClient, usernameClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { env } from '@tokengator/env/web'

export const authClient = createAuthClient({
  baseURL: env.VITE_API_URL,
  plugins: [adminClient(), organizationClient(), siwsClient(), usernameClient()],
})
