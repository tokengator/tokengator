import { asc, or, sql } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { user } from '@tokengator/db/schema/auth'

import { adminOrganizationSearchPattern } from '../util/admin-organization-search-pattern'

import type { AdminOrganizationListOwnerCandidatesInput } from './admin-organization-list-owner-candidates-input'
import {
  adminOrganizationOwnerCandidateEntityColumns,
  toAdminOrganizationOwnerCandidateEntity,
} from './admin-organization.entity'

function adminOrganizationOwnerCandidateFilter(search?: string) {
  const pattern = adminOrganizationSearchPattern(search)

  if (!pattern) {
    return undefined
  }

  return or(sql`${user.name} like ${pattern} escape '\\'`, sql`${user.username} like ${pattern} escape '\\'`)
}

export async function adminOrganizationListOwnerCandidates(input?: AdminOrganizationListOwnerCandidatesInput) {
  const limit = input?.limit ?? 10
  const whereClause = adminOrganizationOwnerCandidateFilter(input?.search)
  const query = db.select(adminOrganizationOwnerCandidateEntityColumns).from(user).$dynamic()

  if (whereClause) {
    query.where(whereClause)
  }

  return (await query.orderBy(asc(user.name), asc(user.username), asc(user.id)).limit(limit)).map(
    toAdminOrganizationOwnerCandidateEntity,
  )
}
