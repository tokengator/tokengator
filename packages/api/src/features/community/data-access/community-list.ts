import { asc } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { organization } from '@tokengator/db/schema/auth'

import { communityEntityColumns, toCommunityEntity } from './community.entity'

export async function communityList() {
  const communities = await db
    .select(communityEntityColumns)
    .from(organization)
    .orderBy(asc(organization.name), asc(organization.slug))

  return {
    communities: communities.map(toCommunityEntity),
  }
}
