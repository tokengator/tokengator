import { createServerFn } from '@tanstack/react-start'

import { authMiddleware } from '@/features/auth/data-access/auth-middleware'
import { serverOrpcClient } from '@/lib/orpc-server'

interface AdminCommunityGetInput {
  organizationId: string
}

export const getAdminCommunity = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator((input: AdminCommunityGetInput) => input)
  .handler(async ({ data }) => {
    return serverOrpcClient.adminOrganization.get({
      organizationId: data.organizationId,
    })
  })
