import { eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { communityRole } from '@tokengator/db/schema/community-role'

export async function adminCommunityRoleRecordGet(communityRoleId: string) {
  const [record] = await db
    .select({
      id: communityRole.id,
      organizationId: communityRole.organizationId,
      teamId: communityRole.teamId,
    })
    .from(communityRole)
    .where(eq(communityRole.id, communityRoleId))
    .limit(1)

  return record ?? null
}
