import { ORPCError } from '@orpc/server'

import { protectedProcedure } from '../../../lib/prodecures'
import { profileSolanaWalletDelete as profileSolanaWalletDeleteDataAccess } from '../data-access/profile-solana-wallet-delete'
import { profileSolanaWalletDeleteInputSchema } from '../data-access/profile-solana-wallet-delete-input-schema'

export const profileFeatureDeleteSolanaWallet = protectedProcedure
  .input(profileSolanaWalletDeleteInputSchema)
  .handler(async ({ context, input }) => {
    const result = await profileSolanaWalletDeleteDataAccess({
      requestHeaders: context.requestHeaders,
      solanaWallet: input,
      userId: context.session.user.id,
    })

    if (result.status === 'solana-wallet-not-found') {
      throw new ORPCError('NOT_FOUND', {
        message: 'Solana wallet not found.',
      })
    }

    if (result.status === 'solana-wallet-is-primary') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Primary Solana wallet cannot be deleted.',
      })
    }

    return {
      solanaWalletId: result.solanaWalletId,
    }
  })
