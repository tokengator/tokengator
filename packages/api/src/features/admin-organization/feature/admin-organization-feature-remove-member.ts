import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/prodecures'

import { adminOrganizationRemoveMember as adminOrganizationRemoveMemberDataAccess } from '../data-access/admin-organization-remove-member'
import { adminOrganizationRemoveMemberInputSchema } from '../data-access/admin-organization-remove-member-input-schema'

export const adminOrganizationFeatureRemoveMember = adminProcedure
  .input(adminOrganizationRemoveMemberInputSchema)
  .handler(async ({ input }) => {
    const result = await adminOrganizationRemoveMemberDataAccess(input.memberId)

    if (result.status === 'member-not-found') {
      throw new ORPCError('NOT_FOUND', {
        message: 'Member not found.',
      })
    }

    if (result.status === 'last-owner') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'You cannot remove the last owner from an organization.',
      })
    }

    return {
      memberId: result.memberId,
      organizationId: result.organizationId,
      userId: result.userId,
    }
  })
