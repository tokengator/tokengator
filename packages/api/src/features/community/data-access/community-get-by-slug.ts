import { eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { organization } from '@tokengator/db/schema/auth'

import { listCommunityRoleRecords } from '../../../features/community-role-sync'

import {
  communityEntityColumns,
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
          id: condition.assetGroupId,
          label: condition.assetGroupLabel,
          type: condition.assetGroupType,
        }),
      )
    }
  }

  return toCommunityDetailEntity({
    collections: [...collectionsById.values()].sort(compareCommunityCollections),
    community: toCommunityEntity(communityRecord),
  })
}
