import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'

import { adminOrganizationGet as adminOrganizationGetDataAccess } from '../data-access/admin-organization-get'
import { adminOrganizationGetInputSchema } from '../data-access/admin-organization-get-input-schema'

export const adminOrganizationFeatureGet = adminProcedure
  .input(adminOrganizationGetInputSchema)
  .handler(async ({ input }) => {
    const organization = await adminOrganizationGetDataAccess(input.organizationId)

    if (!organization) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Organization not found.',
      })
    }

    return organization
  })
