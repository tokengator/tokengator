import { asset, assetTrait } from '@tokengator/db/schema/asset'
import { organization } from '@tokengator/db/schema/auth'

export const communityCollectionAssetEntityColumns = {
  address: asset.address,
  id: asset.id,
  metadataImageUrl: asset.metadataImageUrl,
  metadataName: asset.metadataName,
  metadataSymbol: asset.metadataSymbol,
  owner: asset.owner,
}

export const communityCollectionAssetTraitEntityColumns = {
  assetId: assetTrait.assetId,
  groupId: assetTrait.traitKey,
  groupLabel: assetTrait.traitLabel,
  value: assetTrait.traitValue,
  valueLabel: assetTrait.traitValueLabel,
}

export const communityEntityColumns = {
  id: organization.id,
  logo: organization.logo,
  name: organization.name,
  slug: organization.slug,
}

export type CommunityCollectionAssetTrait = {
  groupId: string
  groupLabel: string
  value: string
  valueLabel: string
}

export type CommunityCollectionFacetOptionTotals = {
  label: string
  total: number
}

export type CommunityCollectionFacetTotals = Record<
  string,
  {
    label: string
    options: Record<string, CommunityCollectionFacetOptionTotals>
    total: number
  }
>

export function toCommunityCollectionAssetEntity(input: {
  address: string
  id: string
  metadataImageUrl: string | null
  metadataName: string | null
  metadataSymbol: string | null
  owner: string
  traits: CommunityCollectionAssetTrait[]
}) {
  return input
}

export function toCommunityCollectionAssetTrait(input: CommunityCollectionAssetTrait) {
  return input
}

export function toCommunityCollectionEntity(input: {
  address: string
  facetTotals: CommunityCollectionFacetTotals
  id: string
  label: string
  type: 'collection'
}) {
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

export function toCommunityListCollectionAssetsResult(input: {
  assets: CommunityCollectionAssetEntity[]
  facetTotals: CommunityCollectionFacetTotals
}) {
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
