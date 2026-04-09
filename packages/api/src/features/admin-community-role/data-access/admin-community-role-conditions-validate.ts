import { inArray } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { assetGroup } from '@tokengator/db/schema/asset'

import type { AdminCommunityRoleConditionInput } from './admin-community-role-condition-input'

export async function adminCommunityRoleConditionsValidate(conditions: AdminCommunityRoleConditionInput[]) {
  const uniqueAssetGroupIds = [...new Set(conditions.map((condition) => condition.assetGroupId))]

  if (uniqueAssetGroupIds.length !== conditions.length) {
    return {
      status: 'duplicate-asset-group' as const,
    }
  }

  const assetGroups = await db
    .select({
      id: assetGroup.id,
    })
    .from(assetGroup)
    .where(inArray(assetGroup.id, uniqueAssetGroupIds))

  if (assetGroups.length !== uniqueAssetGroupIds.length) {
    return {
      status: 'asset-group-not-found' as const,
    }
  }

  for (const condition of conditions) {
    if (condition.maximumAmount !== null && BigInt(condition.maximumAmount) < BigInt(condition.minimumAmount)) {
      return {
        status: 'maximum-amount-less-than-minimum' as const,
      }
    }
  }

  return {
    status: 'success' as const,
  }
}
