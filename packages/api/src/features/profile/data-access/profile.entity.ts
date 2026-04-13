import type { IdentityProvider } from '@tokengator/db/schema/auth'
import type { OrganizationMembershipEntity } from '../../organization'
import { profileSolanaWalletAddressEllipsify } from '../util/profile-solana-wallet-address-ellipsify'
import { profileSolanaWalletNameNormalize } from '../util/profile-solana-wallet-name-normalize'

export function toProfileIdentityEntity(identity: {
  avatarUrl: string | null
  displayName: string | null
  email: string | null
  id: string
  isPrimary: boolean
  linkedAt: Date
  provider: IdentityProvider
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

export function toProfileSettingsEntity(settings: { developerMode: boolean; private: boolean }) {
  return {
    developerMode: settings.developerMode,
    private: settings.private,
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

export function toProfileUserEntity(user: {
  id: string
  image: string | null
  name: string
  private: boolean
  username: string
}) {
  return {
    id: user.id,
    image: user.image,
    name: user.name,
    private: user.private,
    username: user.username,
  }
}

export type ProfileIdentityEntity = ReturnType<typeof toProfileIdentityEntity>
export type ProfileFinalizeDiscordAuthResult = {
  hasDiscordAccount: boolean
  updated: boolean
  username: string | null
}
export type ProfileGetSettingsResult = {
  settings: ProfileSettingsEntity
}
export type ProfileListIdentitiesResult = {
  identities: ProfileIdentityEntity[]
}
export type ProfileListCommunitiesByUsernameResult = {
  communities: OrganizationMembershipEntity[]
}
export type ProfileListIdentitiesByUsernameResult = {
  identities: ProfileIdentityEntity[]
  solanaWallets: ProfileSolanaWalletEntity[]
}
export type ProfileListSolanaWalletsResult = {
  solanaWallets: ProfileSolanaWalletEntity[]
}
export type ProfileSetPrimarySolanaWalletResult = {
  solanaWallet: ProfileSolanaWalletEntity
}
export type ProfileSettingsEntity = ReturnType<typeof toProfileSettingsEntity>
export type ProfileSolanaWalletDeleteResult = {
  solanaWalletId: string
}
export type ProfileSolanaWalletEntity = ReturnType<typeof toProfileSolanaWalletEntity>
export type ProfileSyncDiscordUsernameResult = {
  updated: boolean
  username: string | null
}
export type ProfileUserEntity = ReturnType<typeof toProfileUserEntity>
export type ProfileUpdateSettingsResult = {
  settings: ProfileSettingsEntity
}
export type ProfileUpdateSolanaWalletResult = {
  solanaWallet: ProfileSolanaWalletEntity
}
