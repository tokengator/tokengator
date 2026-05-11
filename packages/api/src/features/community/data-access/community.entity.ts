import { asset } from '@tokengator/db/schema/asset'
import { organization } from '@tokengator/db/schema/auth'
import type { ResolverKind } from '@tokengator/indexer'

import { getAssetGroupImageUrl } from '../../../lib/asset-group-image-url'
import { parseStoredJson } from '../../../lib/stored-json'

export const communityCollectionAssetEntityColumns = {
  address: asset.address,
  id: asset.id,
  metadataImageUrl: asset.metadataImageUrl,
  metadataName: asset.metadataName,
  metadataSymbol: asset.metadataSymbol,
  owner: asset.owner,
  traits: asset.traits,
}

export const communityCollectionAssetDetailEntityColumns = {
  address: asset.address,
  id: asset.id,
  metadataImageUrl: asset.metadataImageUrl,
  metadataJson: asset.metadataJson,
  metadataJsonUrl: asset.metadataJsonUrl,
  metadataName: asset.metadataName,
  metadataSymbol: asset.metadataSymbol,
  owner: asset.owner,
  traits: asset.traits,
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

export type CommunityCollectionInsightsTraitOptionEntity = {
  label: string
  total: number
  value: string
}

export type CommunityCollectionInsightsTraitGroupEntity = {
  groupId: string
  label: string
  options: CommunityCollectionInsightsTraitOptionEntity[]
  total: number
}

export type CommunityCollectionLeaderboardAssetEntity = {
  address: string
  id: string
  metadataImageUrl: string | null
  metadataName: string | null
  metadataSymbol: string | null
}

export type CommunityCollectionLeaderboardUserEntity = {
  id: string
  image: string | null
  name: string
  username: string | null
}

export type CommunityCollectionLeaderboardHolderFilter = 'known' | 'unknown'

export type CommunityCollectionLeaderboardWalletEntity = {
  address: string
  assets: CommunityCollectionLeaderboardAssetEntity[]
  assetTotal: number
  id: string | null
  name: string | null
}

export type CommunityCollectionLeaderboardHolderEntity = {
  assetTotal: number
  displayName: string
  holderId: string
  kind: 'user' | 'wallet'
  rank: number
  user: CommunityCollectionLeaderboardUserEntity | null
  wallets: CommunityCollectionLeaderboardWalletEntity[]
}

export type CommunityMarketplaceAvailabilityEntity = {
  magicEden: {
    enabled: boolean
    unavailableReason: 'api-key-missing' | 'cluster-unsupported' | 'listing-secret-missing' | null
  }
}

export type CommunityCollectionAssetMarketplaceEntity =
  | {
      assetGroupId: string
      enabled: true
      unavailableReason: null
    }
  | {
      assetGroupId: string | null
      enabled: false
      unavailableReason: 'api-key-missing' | 'cluster-unsupported' | 'listing-secret-missing' | 'missing-symbol'
    }

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

export function toCommunityCollectionAssetDetailEntity(input: {
  address: string
  id: string
  metadataImageUrl: string | null
  metadataJson: Record<string, unknown> | null
  metadataJsonUrl: string | null
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

export function parseStoredAssetTraits(value: string | null): CommunityCollectionAssetTrait[] {
  const parsedValue = parseStoredJson<unknown>(value)

  if (!Array.isArray(parsedValue)) {
    return []
  }

  const traits: CommunityCollectionAssetTrait[] = []

  for (const entry of parsedValue) {
    if (
      !entry ||
      typeof entry !== 'object' ||
      !('groupId' in entry) ||
      !('groupLabel' in entry) ||
      !('value' in entry) ||
      !('valueLabel' in entry)
    ) {
      return []
    }

    const trait = entry as Record<string, unknown>

    if (
      typeof trait.groupId !== 'string' ||
      typeof trait.groupLabel !== 'string' ||
      typeof trait.value !== 'string' ||
      typeof trait.valueLabel !== 'string'
    ) {
      return []
    }

    traits.push(
      toCommunityCollectionAssetTrait({
        groupId: trait.groupId,
        groupLabel: trait.groupLabel,
        value: trait.value,
        valueLabel: trait.valueLabel,
      }),
    )
  }

  return traits
}

export function toCommunityCollectionOwnerCandidateEntity(input: {
  address: string | null
  id: string
  kind: 'user' | 'wallet'
  name: string
  username: string | null
  value: string
}) {
  return input
}

export function toCommunityCollectionEntity(input: {
  address: string
  facetTotals: CommunityCollectionFacetTotals
  id: string
  imageUrl: string | null
  label: string
  symbolMagicEden: string | null
  type: 'collection'
}) {
  return {
    address: input.address,
    facetTotals: input.facetTotals,
    id: input.id,
    imageUrl: getAssetGroupImageUrl(input),
    label: input.label,
    symbolMagicEden: input.symbolMagicEden,
    type: input.type,
  }
}

export function toCommunityRoleAssetGroupEntity(input: {
  address: string
  id: string
  imageUrl: string | null
  label: string
  maximumAmount: string | null
  minimumAmount: string
  resolverKind: ResolverKind
  symbolMagicEden: string | null
  type: 'collection' | 'mint'
}) {
  return {
    address: input.address,
    id: input.id,
    imageUrl: getAssetGroupImageUrl(input),
    label: input.label,
    maximumAmount: input.maximumAmount,
    minimumAmount: input.minimumAmount,
    resolverKind: input.resolverKind,
    symbolMagicEden: input.symbolMagicEden,
    type: input.type,
  }
}

export function toCommunityRoleEntity(input: {
  assigned: boolean
  assignedAssetGroups: CommunityRoleAssetGroupEntity[]
  assetGroups: CommunityRoleAssetGroupEntity[]
  id: string
  matchMode: 'all' | 'any'
  name: string
  slug: string
}) {
  return input
}

export function toCommunityDetailEntity(input: {
  collections: CommunityCollectionEntity[]
  community: CommunityEntity
  roles: CommunityRoleEntity[]
}) {
  return {
    collections: input.collections,
    id: input.community.id,
    logo: input.community.logo,
    name: input.community.name,
    roles: input.roles,
    slug: input.community.slug,
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
export type CommunityCollectionAssetDetailEntity = ReturnType<typeof toCommunityCollectionAssetDetailEntity>
export type CommunityCollectionEntity = ReturnType<typeof toCommunityCollectionEntity>
export type CommunityCollectionOwnerCandidateEntity = ReturnType<typeof toCommunityCollectionOwnerCandidateEntity>
export type CommunityDetailEntity = ReturnType<typeof toCommunityDetailEntity>
export type CommunityEntity = ReturnType<typeof toCommunityEntity>
export type CommunityGetBySlugResult = Omit<CommunityDetailEntity, 'collections'> & {
  collections: Array<CommunityCollectionEntity & { assetMarketplace: CommunityCollectionAssetMarketplaceEntity }>
  marketplace: CommunityMarketplaceAvailabilityEntity
}
export type CommunityGetCollectionInsightsResult = {
  assetTotal: number
  traitGroups: CommunityCollectionInsightsTraitGroupEntity[]
}
export type CommunityListCollectionLeaderboardResult = {
  assetTotal: number
  holderTotal: number
  holders: CommunityCollectionLeaderboardHolderEntity[]
}
export type CommunityListCollectionAssetsResult = ReturnType<typeof toCommunityListCollectionAssetsResult>
export type CommunityListResult = {
  communities: CommunityEntity[]
}
export type CommunityRoleAssetGroupEntity = ReturnType<typeof toCommunityRoleAssetGroupEntity>
export type CommunityRoleEntity = ReturnType<typeof toCommunityRoleEntity>
