import { createServerFn } from '@tanstack/react-start'
import type { AppAuthState } from '@/features/auth/data-access/get-app-auth-state'

import { authMiddleware } from '@/features/auth/data-access/auth-middleware'
import { serverOrpcClient } from '@/lib/orpc-server'

export const getProfileListIdentities = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    if (!context.session) {
      return null
    }

    return (await serverOrpcClient.profile.listIdentities()) satisfies AppAuthState['identities']
  })
