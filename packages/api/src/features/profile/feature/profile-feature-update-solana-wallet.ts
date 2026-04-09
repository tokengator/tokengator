import { ORPCError } from '@orpc/server'

import { protectedProcedure } from '../../../lib/procedures'
import { profileSolanaWalletUpdate as profileSolanaWalletUpdateDataAccess } from '../data-access/profile-solana-wallet-update'
import { profileSolanaWalletUpdateInputSchema } from '../data-access/profile-solana-wallet-update-input-schema'

export const profileFeatureUpdateSolanaWallet = protectedProcedure
  .input(profileSolanaWalletUpdateInputSchema)
  .handler(async ({ context, input }) => {
    const result = await profileSolanaWalletUpdateDataAccess({
      requestHeaders: context.requestHeaders,
      solanaWallet: input,
      userId: context.session.user.id,
    })

    if (result.status === 'solana-wallet-not-found') {
      throw new ORPCError('NOT_FOUND', {
        message: 'Solana wallet not found.',
      })
    }

    return {
      solanaWallet: result.solanaWallet,
    }
  })
