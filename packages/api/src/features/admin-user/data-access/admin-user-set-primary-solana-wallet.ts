import { profileSolanaWalletSetPrimary } from '../../profile/data-access/profile-solana-wallet-set-primary'

export async function adminUserSetPrimarySolanaWallet(input: {
  requestHeaders?: Headers
  solanaWalletId: string
  userId: string
}) {
  return await profileSolanaWalletSetPrimary({
    requestHeaders: input.requestHeaders,
    solanaWallet: {
      id: input.solanaWalletId,
    },
    userId: input.userId,
  })
}
