import type { IdentityProvider } from '@tokengator/db/schema/auth'
import type { OrganizationMembershipEntity } from '../../organization'
import { profileSolanaWalletAddressEllipsify } from '../util/profile-solana-wallet-address-ellipsify'
import { profileSolanaWalletNameNormalize } from '../util/profile-solana-wallet-name-normalize'

export type ProfileCommunityCollectionAssetEntity = {
  address: string
  amount: string
  id: string
  metadataImageUrl: string | null
  metadataName: string | null
  metadataSymbol: string | null
  owner: string
  traits: ProfileCommunityCollectionAssetTraitEntity[]
}

export type ProfileCommunityCollectionAssetTraitEntity = {
  groupId: string
  groupLabel: string
  value: string
  valueLabel: string
}

export type ProfileCommunityAssetRoleCollectionGroupEntity = {
  address: string
  id: string
  imageUrl: string | null
  label: string
  maximumAmount: string | null
  minimumAmount: string
  ownedAssets: ProfileCommunityCollectionAssetEntity[]
  type: 'collection'
}

export type ProfileCommunityMintAccountEntity = {
  address: string
  amount: string
  id: string
  owner: string
}

export type ProfileCommunityAssetRoleMintGroupEntity = {
  address: string
  id: string
  imageUrl: string | null
  label: string
  maximumAmount: string | null
  minimumAmount: string
  ownedAccounts: ProfileCommunityMintAccountEntity[]
  ownedAmount: string
  type: 'mint'
}

export type ProfileCommunityAssetRoleGroupEntity =
  | ProfileCommunityAssetRoleCollectionGroupEntity
  | ProfileCommunityAssetRoleMintGroupEntity

export type ProfileCommunityAssetRoleEntity = {
  assetGroups: ProfileCommunityAssetRoleGroupEntity[]
  id: string
  matchMode: 'all' | 'any'
  name: string
  slug: string
}

export type ProfileCommunityMembershipEntity = OrganizationMembershipEntity & {
  assetRoles: ProfileCommunityAssetRoleEntity[]
}

export interface ProfileIdentityEntity {
  avatarUrl: string | null
  displayName: string | null
  email: string | null
  id: string
  isPrimary: boolean
  label: string
  linkedAt: number
  provider: IdentityProvider
  providerId: string
  referenceId?: string
  referenceType?: 'account' | 'solana_wallet'
  username: string | null
}

function getProfileIdentityLabel(identity: {
  displayName: string | null
  providerId: string
  username: string | null
}) {
  const candidates = [identity.displayName, identity.username]
    .map((value) => value?.trim() ?? null)
    .filter((value): value is string => Boolean(value))

  return candidates[0] ?? identity.providerId
}

export function toProfileIdentityEntity(identity: {
  avatarUrl: string | null
  displayName: string | null
  email: string | null
  id: string
  isPrimary: boolean
  linkedAt: Date
  provider: IdentityProvider
  providerId: string
  referenceId: string
  referenceType: 'account' | 'solana_wallet'
  username: string | null
}): ProfileIdentityEntity {
  return {
    avatarUrl: identity.avatarUrl,
    displayName: identity.displayName,
    email: identity.email,
    id: identity.id,
    isPrimary: identity.isPrimary,
    label: getProfileIdentityLabel(identity),
    linkedAt: identity.linkedAt.getTime(),
    provider: identity.provider,
    providerId: identity.providerId,
    referenceId: identity.referenceId,
    referenceType: identity.referenceType,
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
  communities: ProfileCommunityMembershipEntity[]
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
