import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'

import { adminOrganizationUpdateMemberRole as adminOrganizationUpdateMemberRoleDataAccess } from '../data-access/admin-organization-update-member-role'
import { adminOrganizationUpdateMemberRoleInputSchema } from '../data-access/admin-organization-update-member-role-input-schema'

export const adminOrganizationFeatureUpdateMemberRole = adminProcedure
  .input(adminOrganizationUpdateMemberRoleInputSchema)
  .handler(async ({ input }) => {
    const result = await adminOrganizationUpdateMemberRoleDataAccess({
      memberId: input.memberId,
      role: input.role,
    })

    if (result.status === 'member-not-found') {
      throw new ORPCError('NOT_FOUND', {
        message: 'Member not found.',
      })
    }

    if (result.status === 'last-owner') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'You cannot demote the last owner of an organization.',
      })
    }

    return {
      memberId: result.memberId,
      organizationId: result.organizationId,
      role: result.role,
    }
  })
