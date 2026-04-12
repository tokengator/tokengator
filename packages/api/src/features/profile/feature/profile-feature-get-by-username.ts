import { ORPCError } from '@orpc/server'

import { protectedProcedure } from '../../../lib/procedures'

import { profileUserByUsernameGet } from '../data-access/profile-user-by-username-get'
import { profileUsernameInputSchema } from '../data-access/profile-username-input-schema'
import { toProfileUserEntity } from '../data-access/profile.entity'

export const profileFeatureGetByUsername = protectedProcedure
  .input(profileUsernameInputSchema)
  .handler(async ({ input }) => {
    const user = await profileUserByUsernameGet(input.username)

    if (!user) {
      throw new ORPCError('NOT_FOUND', {
        message: 'User not found.',
      })
    }

    return toProfileUserEntity(user)
  })
