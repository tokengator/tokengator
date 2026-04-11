import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'

import { adminUserCommunityMembershipUpdateInputSchema } from '../data-access/admin-user-community-membership-update-input-schema'
import { adminUserUpdateCommunityMembership } from '../data-access/admin-user-update-community-membership'

export const adminUserFeatureUpdateCommunityMembership = adminProcedure
  .input(adminUserCommunityMembershipUpdateInputSchema)
  .handler(async ({ input }) => {
    const result = await adminUserUpdateCommunityMembership(input)

    if (result.status === 'last-owner') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'This member is the last owner of the community.',
      })
    }

    if (result.status === 'member-not-found') {
      throw new ORPCError('NOT_FOUND', {
        message: 'Membership not found.',
      })
    }

    return {
      memberId: result.memberId,
      organizationId: result.organizationId,
      role: result.role,
    }
  })
