import { profileSolanaWalletAddressEllipsify } from '../util/profile-solana-wallet-address-ellipsify'
import { profileSolanaWalletNameNormalize } from '../util/profile-solana-wallet-name-normalize'

export function toProfileIdentityEntity(identity: {
  avatarUrl: string | null
  displayName: string | null
  email: string | null
  id: string
  isPrimary: boolean
  linkedAt: Date
  provider: string
  providerId: string
  username: string | null
}) {
  return {
    avatarUrl: identity.avatarUrl,
    displayName: identity.displayName,
    email: identity.email,
    id: identity.id,
    isPrimary: identity.isPrimary,
    linkedAt: identity.linkedAt.getTime(),
    provider: identity.provider,
    providerId: identity.providerId,
    username: identity.username,
  }
}

export function toProfileSolanaWalletEntity(wallet: {
  address: string
  id: string
  isPrimary: boolean
  name: string | null
}) {
  const name = profileSolanaWalletNameNormalize(wallet.name)

  return {
    address: wallet.address,
    displayName: name ?? profileSolanaWalletAddressEllipsify(wallet.address),
    id: wallet.id,
    isPrimary: wallet.isPrimary,
    name,
  }
}

export type ProfileIdentityEntity = ReturnType<typeof toProfileIdentityEntity>
export type ProfileListIdentitiesResult = {
  identities: ProfileIdentityEntity[]
}
export type ProfileListSolanaWalletsResult = {
  solanaWallets: ProfileSolanaWalletEntity[]
}
export type ProfileSetPrimarySolanaWalletResult = {
  solanaWallet: ProfileSolanaWalletEntity
}
export type ProfileSolanaWalletDeleteResult = {
  solanaWalletId: string
}
export type ProfileSolanaWalletEntity = ReturnType<typeof toProfileSolanaWalletEntity>
export type ProfileSyncDiscordUsernameResult = {
  updated: boolean
  username: string | null
}
export type ProfileUpdateSolanaWalletResult = {
  solanaWallet: ProfileSolanaWalletEntity
}
