import { createServerFn } from '@tanstack/react-start'

import { authMiddleware } from '@/middleware/auth'
import { serverOrpcClient } from '@/utils/orpc-server'

export interface OrganizationListMineOrganization {
  id: string
  logo: string | null
  name: string
  role: string
  slug: string
}

export interface OrganizationListMineData {
  organizations: OrganizationListMineOrganization[]
}

export const getOrganizationListMine = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    if (!context.session) {
      return null
    }

    return (await serverOrpcClient.organization.listMine()) satisfies OrganizationListMineData
  })
