import { ORPCError } from '@orpc/server'

import { protectedProcedure } from '../../../lib/procedures'
import { organizationListMine as organizationListMineDataAccess } from '../../organization/data-access/organization-list-mine'

import { profileVisibleUserByUsernameGet } from '../data-access/profile-user-by-username-get'
import { profileUsernameInputSchema } from '../data-access/profile-username-input-schema'

export const profileFeatureListCommunitiesByUsername = protectedProcedure
  .input(profileUsernameInputSchema)
  .handler(async ({ context, input }) => {
    const user = await profileVisibleUserByUsernameGet({
      username: input.username,
      viewerUserId: context.session.user.id,
    })

    if (!user) {
      throw new ORPCError('NOT_FOUND', {
        message: 'User not found.',
      })
    }

    const communities = await organizationListMineDataAccess(user.id)

    return {
      communities: communities.organizations,
    }
  })
