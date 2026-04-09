import { asc, count, eq, inArray, or, sql } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { member, organization, user } from '@tokengator/db/schema/auth'

import { adminOrganizationSearchPattern } from '../util/admin-organization-search-pattern'

import type { AdminOrganizationListInput } from './admin-organization-list-input'
import {
  adminOrganizationEntityColumns,
  adminOrganizationMemberEntityColumns,
  toAdminOrganizationEntity,
  toAdminOrganizationListEntity,
  type AdminOrganizationMemberRecord,
} from './admin-organization.entity'

function adminOrganizationFilter(search?: string) {
  const pattern = adminOrganizationSearchPattern(search)

  if (!pattern) {
    return undefined
  }

  return or(
    sql`${organization.name} like ${pattern} escape '\\'`,
    sql`${organization.slug} like ${pattern} escape '\\'`,
  )
}

export async function adminOrganizationList(input?: AdminOrganizationListInput) {
  const limit = input?.limit ?? 25
  const offset = input?.offset ?? 0
  const whereClause = adminOrganizationFilter(input?.search)
  const organizationRecords = whereClause
    ? await db
        .select(adminOrganizationEntityColumns)
        .from(organization)
        .where(whereClause)
        .orderBy(asc(organization.name), asc(organization.slug))
        .limit(limit)
        .offset(offset)
    : await db
        .select(adminOrganizationEntityColumns)
        .from(organization)
        .orderBy(asc(organization.name), asc(organization.slug))
        .limit(limit)
        .offset(offset)

  const [totalResult] = whereClause
    ? await db
        .select({
          count: count(),
        })
        .from(organization)
        .where(whereClause)
    : await db
        .select({
          count: count(),
        })
        .from(organization)
  const organizations = organizationRecords.map(toAdminOrganizationEntity)
  const organizationIds = organizations.map((entry) => entry.id)
  const members =
    organizationIds.length === 0
      ? []
      : await db
          .select(adminOrganizationMemberEntityColumns)
          .from(member)
          .innerJoin(user, eq(member.userId, user.id))
          .where(inArray(member.organizationId, organizationIds))
          .orderBy(asc(user.name), asc(user.username), asc(user.id))
  const membersByOrganizationId = new Map<string, AdminOrganizationMemberRecord[]>()

  for (const entry of members) {
    const existingMembers = membersByOrganizationId.get(entry.organizationId) ?? []

    membersByOrganizationId.set(entry.organizationId, [...existingMembers, entry])
  }

  return {
    limit,
    offset,
    organizations: organizations.map((entry) =>
      toAdminOrganizationListEntity({
        members: membersByOrganizationId.get(entry.id) ?? [],
        organization: entry,
      }),
    ),
    total: totalResult?.count ?? 0,
  }
}
