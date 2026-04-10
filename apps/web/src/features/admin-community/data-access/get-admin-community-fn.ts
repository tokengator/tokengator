import { createServerFn } from '@tanstack/react-start'
import type { AdminOrganizationGetInput } from '@tokengator/sdk'

import { authMiddleware } from '@/features/auth/data-access/auth-middleware'
import { serverOrpcClient } from '@/lib/orpc-server'

export const getAdminCommunity = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator((input: AdminOrganizationGetInput) => input)
  .handler(async ({ data }) => {
    return serverOrpcClient.adminOrganization.get({
      organizationId: data.organizationId,
    })
  })
