import { asset } from '@tokengator/db/schema/asset'
import { organization } from '@tokengator/db/schema/auth'

export const communityCollectionAssetEntityColumns = {
  address: asset.address,
  id: asset.id,
  metadataImageUrl: asset.metadataImageUrl,
  metadataName: asset.metadataName,
  metadataSymbol: asset.metadataSymbol,
  owner: asset.owner,
}

export const communityEntityColumns = {
  id: organization.id,
  logo: organization.logo,
  name: organization.name,
  slug: organization.slug,
}

export function toCommunityCollectionAssetEntity(input: {
  address: string
  id: string
  metadataImageUrl: string | null
  metadataName: string | null
  metadataSymbol: string | null
  owner: string
}) {
  return input
}

export function toCommunityCollectionEntity(input: { address: string; id: string; label: string; type: 'collection' }) {
  return input
}

export function toCommunityDetailEntity(input: {
  collections: CommunityCollectionEntity[]
  community: CommunityEntity
}) {
  return {
    ...input.community,
    collections: input.collections,
  }
}

export function toCommunityEntity(input: { id: string; logo: string | null; name: string; slug: string }) {
  return input
}

export function toCommunityListCollectionAssetsResult(input: { assets: CommunityCollectionAssetEntity[] }) {
  return input
}

export type CommunityCollectionAssetEntity = ReturnType<typeof toCommunityCollectionAssetEntity>
export type CommunityCollectionEntity = ReturnType<typeof toCommunityCollectionEntity>
export type CommunityDetailEntity = ReturnType<typeof toCommunityDetailEntity>
export type CommunityEntity = ReturnType<typeof toCommunityEntity>
export type CommunityGetBySlugResult = CommunityDetailEntity
export type CommunityListCollectionAssetsResult = ReturnType<typeof toCommunityListCollectionAssetsResult>
export type CommunityListResult = {
  communities: CommunityEntity[]
}
