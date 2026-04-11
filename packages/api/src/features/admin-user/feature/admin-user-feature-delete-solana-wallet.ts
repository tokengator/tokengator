import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'

import { adminUserDeleteSolanaWallet } from '../data-access/admin-user-delete-solana-wallet'
import { adminUserDeleteSolanaWalletInputSchema } from '../data-access/admin-user-delete-solana-wallet-input-schema'

export const adminUserFeatureDeleteSolanaWallet = adminProcedure
  .input(adminUserDeleteSolanaWalletInputSchema)
  .handler(async ({ context, input }) => {
    const result = await adminUserDeleteSolanaWallet({
      requestHeaders: context.requestHeaders,
      solanaWalletId: input.solanaWalletId,
      userId: input.userId,
    })

    if (result.status === 'solana-wallet-is-primary') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Primary Solana wallets cannot be deleted.',
      })
    }

    if (result.status === 'solana-wallet-not-found') {
      throw new ORPCError('NOT_FOUND', {
        message: 'Solana wallet not found.',
      })
    }

    return {
      solanaWalletId: result.solanaWalletId,
    }
  })
