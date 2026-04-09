import { asc, eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { team } from '@tokengator/db/schema/auth'

export async function adminOrganizationTeamIdsList(organizationId: string) {
  const teamRecords = await db
    .select({
      id: team.id,
    })
    .from(team)
    .where(eq(team.organizationId, organizationId))
    .orderBy(asc(team.id))

  return teamRecords.map((entry) => entry.id)
}
