import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'

import { adminUserUpdateSolanaWallet } from '../data-access/admin-user-update-solana-wallet'
import { adminUserUpdateSolanaWalletInputSchema } from '../data-access/admin-user-update-solana-wallet-input-schema'

export const adminUserFeatureUpdateSolanaWallet = adminProcedure
  .input(adminUserUpdateSolanaWalletInputSchema)
  .handler(async ({ context, input }) => {
    const result = await adminUserUpdateSolanaWallet({
      name: input.name,
      requestHeaders: context.requestHeaders,
      solanaWalletId: input.solanaWalletId,
      userId: input.userId,
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
