import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'

import { adminOrganizationDelete as adminOrganizationDeleteDataAccess } from '../data-access/admin-organization-delete'
import { adminOrganizationDeleteInputSchema } from '../data-access/admin-organization-delete-input-schema'

export const adminOrganizationFeatureDelete = adminProcedure
  .input(adminOrganizationDeleteInputSchema)
  .handler(async ({ input }) => {
    const result = await adminOrganizationDeleteDataAccess(input.organizationId)

    if (!result) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Organization not found.',
      })
    }

    return result
  })
