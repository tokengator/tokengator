import { profileIdentitiesList } from '../../profile/data-access/profile-identities-list'
import { profileSolanaWalletList } from '../../profile/data-access/profile-solana-wallet-list'

import { adminUserRecordGet } from './admin-user-record-get'

export async function adminUserListIdentities(userId: string) {
  const existingUser = await adminUserRecordGet(userId)

  if (!existingUser) {
    return null
  }

  const [identities, solanaWallets] = await Promise.all([
    profileIdentitiesList({ userId: existingUser.id }),
    profileSolanaWalletList(existingUser.id),
  ])

  return {
    identities: identities.identities,
    solanaWallets: solanaWallets.solanaWallets,
  }
}
