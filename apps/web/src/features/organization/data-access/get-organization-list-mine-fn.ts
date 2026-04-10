import { createServerFn } from '@tanstack/react-start'
import type { OrganizationListMineResult } from '@tokengator/sdk'

import { authMiddleware } from '@/features/auth/data-access/auth-middleware'
import { serverOrpcClient } from '@/lib/orpc-server'

export const getOrganizationListMine = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    if (!context.session) {
      return null
    }

    return (await serverOrpcClient.organization.listMine()) satisfies OrganizationListMineResult
  })
