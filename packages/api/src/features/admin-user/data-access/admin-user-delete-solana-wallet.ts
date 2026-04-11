import { profileSolanaWalletDelete } from '../../profile/data-access/profile-solana-wallet-delete'

export async function adminUserDeleteSolanaWallet(input: {
  requestHeaders?: Headers
  solanaWalletId: string
  userId: string
}) {
  return await profileSolanaWalletDelete({
    requestHeaders: input.requestHeaders,
    solanaWallet: {
      id: input.solanaWalletId,
    },
    userId: input.userId,
  })
}
