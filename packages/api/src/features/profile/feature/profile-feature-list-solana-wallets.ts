import { protectedProcedure } from '../../../lib/prodecures'

import { profileSolanaWalletList as profileSolanaWalletListDataAccess } from '../data-access/profile-solana-wallet-list'

export const profileFeatureListSolanaWallets = protectedProcedure.handler(async ({ context }) => {
  return await profileSolanaWalletListDataAccess(context.session.user.id)
})
