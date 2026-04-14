import { eq, inArray } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { assetGroup } from '@tokengator/db/schema/asset'
import { organization } from '@tokengator/db/schema/auth'

import { listCommunityRoleRecords } from '../../../features/community-role-sync'
import { parseStoredJsonOrValue } from '../../../lib/stored-json'

import {
  communityEntityColumns,
  type CommunityCollectionFacetTotals,
  toCommunityCollectionEntity,
  toCommunityDetailEntity,
  toCommunityEntity,
} from './community.entity'

function compareCommunityCollections(
  left: ReturnType<typeof toCommunityCollectionEntity>,
  right: ReturnType<typeof toCommunityCollectionEntity>,
) {
  return (
    left.label.localeCompare(right.label) ||
    left.address.localeCompare(right.address) ||
    left.id.localeCompare(right.id)
  )
}

export async function communityGetBySlug(slug: string) {
  const [communityRecord] = await db
    .select(communityEntityColumns)
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1)

  if (!communityRecord) {
    return null
  }

  const collectionsById = new Map<string, ReturnType<typeof toCommunityCollectionEntity>>()
  const facetTotalsByCollectionId = new Map<string, CommunityCollectionFacetTotals>()
  const communityRoles = await listCommunityRoleRecords(communityRecord.id)

  for (const communityRole of communityRoles) {
    if (!communityRole.enabled) {
      continue
    }

    for (const condition of communityRole.conditions) {
      if (
        !condition.assetGroupEnabled ||
        condition.assetGroupType !== 'collection' ||
        collectionsById.has(condition.assetGroupId)
      ) {
        continue
      }

      collectionsById.set(
        condition.assetGroupId,
        toCommunityCollectionEntity({
          address: condition.assetGroupAddress,
          facetTotals: {},
          id: condition.assetGroupId,
          label: condition.assetGroupLabel,
          type: condition.assetGroupType,
        }),
      )
    }
  }

  if (collectionsById.size > 0) {
    const collectionIds = [...collectionsById.keys()]
    const facetRows = await db
      .select({
        facetTotals: assetGroup.facetTotals,
        id: assetGroup.id,
      })
      .from(assetGroup)
      .where(inArray(assetGroup.id, collectionIds))

    for (const facetRow of facetRows) {
      const parsedFacetTotals = parseStoredJsonOrValue(facetRow.facetTotals)

      facetTotalsByCollectionId.set(
        facetRow.id,
        parsedFacetTotals && typeof parsedFacetTotals === 'object' && !Array.isArray(parsedFacetTotals)
          ? (parsedFacetTotals as CommunityCollectionFacetTotals)
          : {},
      )
    }
  }

  return toCommunityDetailEntity({
    collections: [...collectionsById.values()]
      .map((collection) => ({
        ...collection,
        facetTotals: facetTotalsByCollectionId.get(collection.id) ?? {},
      }))
      .sort(compareCommunityCollections),
    community: toCommunityEntity(communityRecord),
  })
}
