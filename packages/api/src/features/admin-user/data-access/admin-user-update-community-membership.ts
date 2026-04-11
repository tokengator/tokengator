import { and, eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { member } from '@tokengator/db/schema/auth'
import { communityManagedMember } from '@tokengator/db/schema/community-role'

import type { AdminOrganizationMemberRole } from '../../admin-organization/data-access/admin-organization-member-role'
import { adminOrganizationHasOwnerRole } from '../../admin-organization/util/admin-organization-owner-role'

export async function adminUserUpdateCommunityMembership(input: {
  memberId: string
  role: AdminOrganizationMemberRole
  userId: string
}) {
  return await db.transaction(async (transaction) => {
    const [existingMember] = await transaction
      .select({
        id: member.id,
        organizationId: member.organizationId,
        role: member.role,
        userId: member.userId,
      })
      .from(member)
      .where(eq(member.id, input.memberId))
      .limit(1)

    if (!existingMember || existingMember.userId !== input.userId) {
      return {
        status: 'member-not-found' as const,
      }
    }

    if (adminOrganizationHasOwnerRole(existingMember.role) && !adminOrganizationHasOwnerRole(input.role)) {
      const ownerRoles = await transaction
        .select({
          role: member.role,
        })
        .from(member)
        .where(eq(member.organizationId, existingMember.organizationId))
      const ownerCount = ownerRoles.filter((entry) => adminOrganizationHasOwnerRole(entry.role)).length

      if (ownerCount <= 1) {
        return {
          status: 'last-owner' as const,
        }
      }
    }

    const [updatedMember] = await transaction
      .update(member)
      .set({
        role: input.role,
      })
      .where(and(eq(member.id, input.memberId), eq(member.userId, input.userId)))
      .returning({
        id: member.id,
        organizationId: member.organizationId,
      })

    if (!updatedMember) {
      return {
        status: 'member-not-found' as const,
      }
    }

    await transaction
      .delete(communityManagedMember)
      .where(
        and(
          eq(communityManagedMember.organizationId, existingMember.organizationId),
          eq(communityManagedMember.userId, existingMember.userId),
        ),
      )

    return {
      memberId: updatedMember.id,
      organizationId: updatedMember.organizationId,
      role: input.role,
      status: 'success' as const,
    }
  })
}
