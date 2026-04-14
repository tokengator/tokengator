import { and, asc, eq, or, sql } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { asset } from '@tokengator/db/schema/asset'

import { communityGetBySlug } from './community-get-by-slug'
import {
  communityCollectionAssetEntityColumns,
  toCommunityCollectionAssetEntity,
  toCommunityListCollectionAssetsResult,
} from './community.entity'

import type { CommunityListCollectionAssetsResult } from './community.entity'

function communityCollectionAssetSearchPattern(value?: string) {
  const trimmedValue = value?.trim().toLowerCase()

  if (!trimmedValue) {
    return null
  }

  const escapedValue = trimmedValue.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')

  return `%${escapedValue}%`
}

export async function communityListCollectionAssets(input: {
  address: string
  owner?: string
  query?: string
  slug: string
}): Promise<CommunityListCollectionAssetsResult | null> {
  const community = await communityGetBySlug(input.slug)

  if (!community) {
    return null
  }

  const collection = community.collections.find((currentCollection) => currentCollection.address === input.address)

  if (!collection) {
    return null
  }

  const filters = [eq(asset.assetGroupId, collection.id)]
  const ownerPattern = communityCollectionAssetSearchPattern(input.owner)
  const queryPattern = communityCollectionAssetSearchPattern(input.query)
  const visibleLabelExpression = sql<string>`lower(coalesce(${asset.metadataName}, ${asset.address}))`

  if (ownerPattern) {
    filters.push(sql`${asset.ownerLower} like ${ownerPattern} escape '\\'`)
  }

  if (queryPattern) {
    filters.push(
      or(
        sql`${asset.addressLower} like ${queryPattern} escape '\\'`,
        sql`coalesce(lower(${asset.metadataName}), '') like ${queryPattern} escape '\\'`,
      )!,
    )
  }

  const assets = await db
    .select(communityCollectionAssetEntityColumns)
    .from(asset)
    .where(and(...filters))
    .orderBy(asc(visibleLabelExpression), asc(asset.ownerLower), asc(asset.addressLower), asc(asset.id))

  return toCommunityListCollectionAssetsResult({
    assets: assets.map(toCommunityCollectionAssetEntity),
  })
}
