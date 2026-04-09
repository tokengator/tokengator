import { and, eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { communityRole } from '@tokengator/db/schema/community-role'

export async function adminCommunityRoleSlugAvailability(input: {
  communityRoleId?: string
  organizationId: string
  slug: string
}) {
  const [existingRole] = await db
    .select({
      id: communityRole.id,
    })
    .from(communityRole)
    .where(and(eq(communityRole.organizationId, input.organizationId), eq(communityRole.slug, input.slug)))
    .limit(1)

  return !existingRole || existingRole.id === input.communityRoleId
}
