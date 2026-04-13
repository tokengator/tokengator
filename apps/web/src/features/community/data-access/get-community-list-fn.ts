import { createServerFn } from '@tanstack/react-start'
import type { CommunityListResult } from '@tokengator/sdk'

import { authMiddleware } from '@/features/auth/data-access/auth-middleware'
import { serverOrpcClient } from '@/lib/orpc-server'

export const getCommunityList = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async () => {
    return (await serverOrpcClient.community.list()) satisfies CommunityListResult
  })
