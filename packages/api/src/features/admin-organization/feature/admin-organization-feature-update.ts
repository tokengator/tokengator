import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'

import { adminOrganizationUpdate as adminOrganizationUpdateDataAccess } from '../data-access/admin-organization-update'
import { adminOrganizationUpdateInputSchema } from '../data-access/admin-organization-update-input-schema'

export const adminOrganizationFeatureUpdate = adminProcedure
  .input(adminOrganizationUpdateInputSchema)
  .handler(async ({ input }) => {
    const result = await adminOrganizationUpdateDataAccess(input)

    if (result.status === 'organization-not-found') {
      throw new ORPCError('NOT_FOUND', {
        message: 'Organization not found.',
      })
    }

    if (result.status === 'organization-slug-taken') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Organization slug is already taken.',
      })
    }

    if (result.status === 'organization-updated-but-not-loaded') {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Organization was updated but could not be loaded.',
      })
    }

    return result.organization
  })
