import { siwsClient } from 'better-auth-solana/client'
import { adminClient, organizationClient, usernameClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { env } from '@tokengator/env/web-client'

function createAuthClientClient() {
  return createAuthClient({
    baseURL: env.API_URL,
    plugins: [adminClient(), organizationClient(), siwsClient(), usernameClient()],
  })
}

let authClientClient: ReturnType<typeof createAuthClientClient> | undefined

export function getAuthClientClient() {
  authClientClient ??= createAuthClientClient()

  return authClientClient
}
