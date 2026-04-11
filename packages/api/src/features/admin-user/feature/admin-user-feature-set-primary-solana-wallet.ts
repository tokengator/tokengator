import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'

import { adminUserSetPrimarySolanaWallet } from '../data-access/admin-user-set-primary-solana-wallet'
import { adminUserSetPrimarySolanaWalletInputSchema } from '../data-access/admin-user-set-primary-solana-wallet-input-schema'

export const adminUserFeatureSetPrimarySolanaWallet = adminProcedure
  .input(adminUserSetPrimarySolanaWalletInputSchema)
  .handler(async ({ context, input }) => {
    const result = await adminUserSetPrimarySolanaWallet({
      requestHeaders: context.requestHeaders,
      solanaWalletId: input.solanaWalletId,
      userId: input.userId,
    })

    switch (result.status) {
      case 'solana-wallet-not-found':
        throw new ORPCError('NOT_FOUND', {
          message: 'Solana wallet not found.',
        })
      case 'success':
        return {
          solanaWallet: result.solanaWallet,
        }
    }

    const unexpectedResult: never = result

    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: `Unexpected set primary solana wallet result: ${JSON.stringify(unexpectedResult)}`,
    })
  })
