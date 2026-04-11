import { adminUserCountsGet } from './admin-user-counts'
import { adminUserRecordGet } from './admin-user-record-get'
import { toAdminUserDetailEntity, toAdminUserEntity } from './admin-user.entity'

export async function adminUserGet(userId: string) {
  const userRecord = await adminUserRecordGet(userId)

  if (!userRecord) {
    return null
  }

  const counts = await adminUserCountsGet([userRecord.id])
  const user = toAdminUserEntity(userRecord)

  return toAdminUserDetailEntity({
    assetCount: counts.assetCounts.get(user.id) ?? 0,
    communityCount: counts.communityCounts.get(user.id) ?? 0,
    identityCount: counts.identityCounts.get(user.id) ?? 0,
    user,
    walletCount: counts.walletCounts.get(user.id) ?? 0,
  })
}
