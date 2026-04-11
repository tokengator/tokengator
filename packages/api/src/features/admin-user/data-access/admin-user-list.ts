import { asc, count, or, sql } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { user } from '@tokengator/db/schema/auth'

import type { AdminUserListInput } from './admin-user-list-input'
import { adminUserCountsGet } from './admin-user-counts'
import { adminUserSearchPattern } from './admin-user-search-pattern'
import { adminUserEntityColumns, toAdminUserEntity, toAdminUserListEntity } from './admin-user.entity'

function adminUserSearchFilter(search?: string) {
  const pattern = adminUserSearchPattern(search)

  if (!pattern) {
    return undefined
  }

  return or(
    sql`${user.email} like ${pattern} escape '\\'`,
    sql`${user.name} like ${pattern} escape '\\'`,
    sql`${user.username} like ${pattern} escape '\\'`,
  )
}

export async function adminUserList(input?: AdminUserListInput) {
  const whereClause = adminUserSearchFilter(input?.search)
  const [totalRows, userRows] = await Promise.all([
    whereClause
      ? db
          .select({
            count: count(),
          })
          .from(user)
          .where(whereClause)
      : db
          .select({
            count: count(),
          })
          .from(user),
    whereClause
      ? db
          .select(adminUserEntityColumns)
          .from(user)
          .where(whereClause)
          .orderBy(asc(user.name), asc(user.username), asc(user.email), asc(user.id))
      : db
          .select(adminUserEntityColumns)
          .from(user)
          .orderBy(asc(user.name), asc(user.username), asc(user.email), asc(user.id)),
  ])
  const users = userRows.map(toAdminUserEntity)
  const counts = await adminUserCountsGet(users.map((currentUser) => currentUser.id))

  return {
    total: totalRows[0]?.count ?? 0,
    users: users.map((currentUser) =>
      toAdminUserListEntity({
        assetCount: counts.assetCounts.get(currentUser.id) ?? 0,
        communityCount: counts.communityCounts.get(currentUser.id) ?? 0,
        identityCount: counts.identityCounts.get(currentUser.id) ?? 0,
        user: currentUser,
        walletCount: counts.walletCounts.get(currentUser.id) ?? 0,
      }),
    ),
  }
}
