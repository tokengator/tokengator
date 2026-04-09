import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'
import { adminCommunityRoleUpdate as adminCommunityRoleUpdateDataAccess } from '../data-access/admin-community-role-update'
import { adminCommunityRoleUpdateInputSchema } from '../data-access/admin-community-role-update-input-schema'

export const adminCommunityRoleFeatureUpdate = adminProcedure
  .input(adminCommunityRoleUpdateInputSchema)
  .handler(async ({ input }) => {
    const result = await adminCommunityRoleUpdateDataAccess(input)

    if (result.status === 'community-role-not-found') {
      throw new ORPCError('NOT_FOUND', {
        message: 'Community role not found.',
      })
    }

    if (result.status === 'community-role-slug-taken') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Community role slug is already taken.',
      })
    }

    if (result.status === 'duplicate-asset-group') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Each asset group can only appear once per community role.',
      })
    }

    if (result.status === 'asset-group-not-found') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'One or more asset groups could not be found.',
      })
    }

    if (result.status === 'maximum-amount-less-than-minimum') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Maximum amount must be greater than or equal to minimum amount.',
      })
    }

    if (result.status === 'community-role-updated-but-not-loaded') {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Community role was updated but could not be loaded.',
      })
    }

    return result.communityRole
  })
