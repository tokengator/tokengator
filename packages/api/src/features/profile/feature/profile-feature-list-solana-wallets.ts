import { protectedProcedure } from '../../../lib/procedures'

import { profileSolanaWalletList as profileSolanaWalletListDataAccess } from '../data-access/profile-solana-wallet-list'

export const profileFeatureListSolanaWallets = protectedProcedure.handler(async ({ context }) => {
  return await profileSolanaWalletListDataAccess(context.session.user.id)
})
