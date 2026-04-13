import { ORPCError } from '@orpc/server'

import { protectedProcedure } from '../../../lib/procedures'

import type { ProfileIdentityEntity } from '../data-access/profile.entity'
import { profileIdentitiesList as profileIdentitiesListDataAccess } from '../data-access/profile-identities-list'
import { profileSolanaWalletList as profileSolanaWalletListDataAccess } from '../data-access/profile-solana-wallet-list'
import { profileVisibleUserByUsernameGet } from '../data-access/profile-user-by-username-get'
import { profileUsernameInputSchema } from '../data-access/profile-username-input-schema'

function toPublicProfileIdentityEntity(identity: ProfileIdentityEntity): ProfileIdentityEntity {
  const { referenceId: _referenceId, referenceType: _referenceType, ...publicIdentity } = identity

  return {
    ...publicIdentity,
    email: null,
  }
}

export const profileFeatureListIdentitiesByUsername = protectedProcedure
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

    const [identities, solanaWallets] = await Promise.all([
      profileIdentitiesListDataAccess({
        userId: user.id,
      }),
      profileSolanaWalletListDataAccess(user.id),
    ])
    const isOwner = user.id === context.session.user.id

    return {
      identities: isOwner ? identities.identities : identities.identities.map(toPublicProfileIdentityEntity),
      solanaWallets: solanaWallets.solanaWallets,
    }
  })
