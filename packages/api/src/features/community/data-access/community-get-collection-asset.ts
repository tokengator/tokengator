import { and, asc, eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { asset, assetTrait } from '@tokengator/db/schema/asset'

import { parseStoredJson } from '../../../lib/stored-json'

import { communityGetBySlug } from './community-get-by-slug'
import {
  communityCollectionAssetDetailEntityColumns,
  communityCollectionAssetTraitEntityColumns,
  toCommunityCollectionAssetDetailEntity,
  toCommunityCollectionAssetTrait,
  type CommunityCollectionAssetDetailEntity,
} from './community.entity'

export async function communityGetCollectionAsset(input: {
  address: string
  asset: string
  slug: string
}): Promise<CommunityCollectionAssetDetailEntity | null> {
  const community = await communityGetBySlug(input.slug)

  if (!community) {
    return null
  }

  const collection = community.collections.find((currentCollection) => currentCollection.address === input.address)

  if (!collection) {
    return null
  }

  const [collectionAsset] = await db
    .select(communityCollectionAssetDetailEntityColumns)
    .from(asset)
    .where(and(eq(asset.address, input.asset), eq(asset.assetGroupId, collection.id)))

  if (!collectionAsset) {
    return null
  }

  const traitRows = await db
    .select(communityCollectionAssetTraitEntityColumns)
    .from(assetTrait)
    .where(eq(assetTrait.assetId, collectionAsset.id))
    .orderBy(asc(assetTrait.traitKey), asc(assetTrait.traitValue), asc(assetTrait.id))

  return toCommunityCollectionAssetDetailEntity({
    ...collectionAsset,
    metadataJson: parseStoredJson<Record<string, unknown>>(collectionAsset.metadataJson),
    traits: traitRows.map((traitRow) =>
      toCommunityCollectionAssetTrait({
        groupId: traitRow.groupId,
        groupLabel: traitRow.groupLabel,
        value: traitRow.value,
        valueLabel: traitRow.valueLabel,
      }),
    ),
  })
}
