import { eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { member } from '@tokengator/db/schema/auth'

export async function adminOrganizationMemberRecordGet(memberId: string) {
  const [record] = await db
    .select({
      id: member.id,
      organizationId: member.organizationId,
      role: member.role,
      userId: member.userId,
    })
    .from(member)
    .where(eq(member.id, memberId))
    .limit(1)

  return record ?? null
}
