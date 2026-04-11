import { profileSolanaWalletUpdate } from '../../profile/data-access/profile-solana-wallet-update'

export async function adminUserUpdateSolanaWallet(input: {
  requestHeaders?: Headers
  name: string
  solanaWalletId: string
  userId: string
}) {
  return await profileSolanaWalletUpdate({
    requestHeaders: input.requestHeaders,
    solanaWallet: {
      id: input.solanaWalletId,
      name: input.name,
    },
    userId: input.userId,
  })
}
