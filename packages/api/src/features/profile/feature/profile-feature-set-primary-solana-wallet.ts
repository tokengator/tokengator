import { ORPCError } from '@orpc/server'

import { protectedProcedure } from '../../../lib/prodecures'
import { profileSolanaWalletSetPrimary as profileSolanaWalletSetPrimaryDataAccess } from '../data-access/profile-solana-wallet-set-primary'
import { profileSolanaWalletSetPrimaryInputSchema } from '../data-access/profile-solana-wallet-set-primary-input-schema'

export const profileFeatureSetPrimarySolanaWallet = protectedProcedure
  .input(profileSolanaWalletSetPrimaryInputSchema)
  .handler(async ({ context, input }) => {
    const result = await profileSolanaWalletSetPrimaryDataAccess({
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
