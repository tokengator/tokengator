import { asc, count, or, sql } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { assetGroup } from '@tokengator/db/schema/asset'

import { getAssetGroupIndexStatusSummaries } from '../../../features/asset-group-index'

import { adminAssetGroupSearchPattern } from '../util/admin-asset-group-search-pattern'

import type { AdminAssetGroupListInput } from './admin-asset-group-list-input'
import {
  adminAssetGroupEntityColumns,
  toAdminAssetGroupEntity,
  toAdminAssetGroupWithIndexingStatus,
} from './admin-asset-group.entity'

function adminAssetGroupFilter(search?: string) {
  const pattern = adminAssetGroupSearchPattern(search)

  if (!pattern) {
    return undefined
  }

  return or(
    sql`${assetGroup.address} like ${pattern} escape '\\'`,
    sql`${assetGroup.label} like ${pattern} escape '\\'`,
    sql`${assetGroup.type} like ${pattern} escape '\\'`,
  )
}

export async function adminAssetGroupList(input?: AdminAssetGroupListInput) {
  const limit = input?.limit ?? 25
  const offset = input?.offset ?? 0
  const whereClause = adminAssetGroupFilter(input?.search)
  const assetGroupRecords = whereClause
    ? await db
        .select(adminAssetGroupEntityColumns)
        .from(assetGroup)
        .where(whereClause)
        .orderBy(asc(assetGroup.label), asc(assetGroup.type), asc(assetGroup.address))
        .limit(limit)
        .offset(offset)
    : await db
        .select(adminAssetGroupEntityColumns)
        .from(assetGroup)
        .orderBy(asc(assetGroup.label), asc(assetGroup.type), asc(assetGroup.address))
        .limit(limit)
        .offset(offset)

  const [totalResult] = whereClause
    ? await db
        .select({
          count: count(),
        })
        .from(assetGroup)
        .where(whereClause)
    : await db
        .select({
          count: count(),
        })
        .from(assetGroup)

  const assetGroups = assetGroupRecords.map(toAdminAssetGroupEntity)
  const indexingStatusByAssetGroupId = await getAssetGroupIndexStatusSummaries({
    assetGroupIds: assetGroups.map((currentAssetGroup) => currentAssetGroup.id),
  })

  return {
    assetGroups: assetGroups.map((currentAssetGroup) =>
      toAdminAssetGroupWithIndexingStatus({
        assetGroup: currentAssetGroup,
        indexingStatus: indexingStatusByAssetGroupId.get(currentAssetGroup.id) ?? null,
      }),
    ),
    limit,
    offset,
    total: totalResult?.count ?? 0,
  }
}
