import type { InferSelectModel } from 'drizzle-orm'
import { asset } from '@tokengator/db/schema/asset'
import { user } from '@tokengator/db/schema/auth'

export const adminUserAssetEntityColumns = {
  address: asset.address,
  amount: asset.amount,
  assetGroupId: asset.assetGroupId,
  id: asset.id,
  indexedAt: asset.indexedAt,
  metadataName: asset.metadataName,
  owner: asset.owner,
  resolverKind: asset.resolverKind,
}

export const adminUserEntityColumns = {
  banExpires: user.banExpires,
  banned: user.banned,
  banReason: user.banReason,
  createdAt: user.createdAt,
  displayUsername: user.displayUsername,
  email: user.email,
  emailVerified: user.emailVerified,
  id: user.id,
  image: user.image,
  name: user.name,
  role: user.role,
  updatedAt: user.updatedAt,
  username: user.username,
}

type AdminUserAssetRecord = Pick<InferSelectModel<typeof asset>, keyof typeof adminUserAssetEntityColumns>
type AdminUserRecord = Pick<InferSelectModel<typeof user>, keyof typeof adminUserEntityColumns>

function normalizeOwner(owner: string) {
  return owner.trim()
}

export function toAdminUserAssetEntity(record: AdminUserAssetRecord) {
  return {
    ...record,
    owner: normalizeOwner(record.owner),
  }
}

export function toAdminUserCommunityEntity(input: {
  createdAt: Date
  gatedRoles: Array<{ id: string; name: string; slug: string }>
  id: string
  logo: string | null
  name: string
  organizationId: string
  role: string
  slug: string
}) {
  return input
}

export function toAdminUserDetailEntity(input: {
  assetCount: number
  communityCount: number
  identityCount: number
  user: AdminUserEntity
  walletCount: number
}) {
  return {
    ...input.user,
    assetCount: input.assetCount,
    communityCount: input.communityCount,
    identityCount: input.identityCount,
    walletCount: input.walletCount,
  }
}

export function toAdminUserEntity(record: AdminUserRecord) {
  return record
}

export function toAdminUserListEntity(input: {
  assetCount: number
  communityCount: number
  identityCount: number
  user: AdminUserEntity
  walletCount: number
}) {
  return {
    ...input.user,
    assetCount: input.assetCount,
    communityCount: input.communityCount,
    identityCount: input.identityCount,
    walletCount: input.walletCount,
  }
}

export type AdminUserAssetEntity = ReturnType<typeof toAdminUserAssetEntity>
export type AdminUserCommunityEntity = ReturnType<typeof toAdminUserCommunityEntity>
export type AdminUserDetailEntity = ReturnType<typeof toAdminUserDetailEntity>
export type AdminUserEntity = ReturnType<typeof toAdminUserEntity>
export type AdminUserListEntity = ReturnType<typeof toAdminUserListEntity>
