import { asc } from 'drizzle-orm'
import type { Database } from '@tokengator/db'
import { organization } from '@tokengator/db/schema/auth'

import { communityEntityColumns, toCommunityEntity } from './community.entity'

export async function communityList(args: { db: Database }) {
  const communities = await args.db
    .select(communityEntityColumns)
    .from(organization)
    .orderBy(asc(organization.name), asc(organization.slug))

  return {
    communities: communities.map(toCommunityEntity),
  }
}
