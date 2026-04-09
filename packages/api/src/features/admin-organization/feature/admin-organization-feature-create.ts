import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'

import { adminOrganizationCreate as adminOrganizationCreateDataAccess } from '../data-access/admin-organization-create'
import { adminOrganizationCreateInputSchema } from '../data-access/admin-organization-create-input-schema'

export const adminOrganizationFeatureCreate = adminProcedure
  .input(adminOrganizationCreateInputSchema)
  .handler(async ({ input }) => {
    const result = await adminOrganizationCreateDataAccess(input)

    if (result.status === 'organization-slug-taken') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Organization slug is already taken.',
      })
    }

    if (result.status === 'owner-user-not-found') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Owner user not found.',
      })
    }

    if (result.status === 'organization-created-but-not-loaded') {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Organization was created but could not be loaded.',
      })
    }

    return result.organization
  })
