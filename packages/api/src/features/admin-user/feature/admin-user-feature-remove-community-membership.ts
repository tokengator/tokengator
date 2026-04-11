import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'

import { adminUserCommunityMembershipRemoveInputSchema } from '../data-access/admin-user-community-membership-remove-input-schema'
import { adminUserRemoveCommunityMembership } from '../data-access/admin-user-remove-community-membership'

export const adminUserFeatureRemoveCommunityMembership = adminProcedure
  .input(adminUserCommunityMembershipRemoveInputSchema)
  .handler(async ({ input }) => {
    const result = await adminUserRemoveCommunityMembership(input)

    switch (result.status) {
      case 'last-owner':
        throw new ORPCError('BAD_REQUEST', {
          message: 'This member is the last owner of the community.',
        })
      case 'member-not-found':
        throw new ORPCError('NOT_FOUND', {
          message: 'Membership not found.',
        })
      case 'success':
        return {
          memberId: result.memberId,
          organizationId: result.organizationId,
          userId: result.userId,
        }
    }

    const unexpectedResult: never = result

    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: `Unexpected remove community membership result: ${JSON.stringify(unexpectedResult)}`,
    })
  })
