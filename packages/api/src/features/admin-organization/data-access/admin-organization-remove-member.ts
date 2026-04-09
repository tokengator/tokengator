import { and, eq, inArray, or } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { member, session, teamMember } from '@tokengator/db/schema/auth'
import { communityManagedMember } from '@tokengator/db/schema/community-role'

import { adminOrganizationHasOwnerRole } from '../util/admin-organization-owner-role'

import { adminOrganizationMemberRecordGet } from './admin-organization-member-record-get'
import { adminOrganizationOwnerCount } from './admin-organization-owner-count'
import { adminOrganizationTeamIdsList } from './admin-organization-team-ids-list'

export async function adminOrganizationRemoveMember(memberId: string) {
  const existingMember = await adminOrganizationMemberRecordGet(memberId)

  if (!existingMember) {
    return {
      status: 'member-not-found' as const,
    }
  }

  if (adminOrganizationHasOwnerRole(existingMember.role)) {
    const ownerCount = await adminOrganizationOwnerCount(existingMember.organizationId)

    if (ownerCount <= 1) {
      return {
        status: 'last-owner' as const,
      }
    }
  }

  const organizationTeamIds = await adminOrganizationTeamIdsList(existingMember.organizationId)

  await db.transaction(async (tx) => {
    await tx
      .delete(communityManagedMember)
      .where(
        and(
          eq(communityManagedMember.organizationId, existingMember.organizationId),
          eq(communityManagedMember.userId, existingMember.userId),
        ),
      )

    if (organizationTeamIds.length > 0) {
      await tx
        .delete(teamMember)
        .where(and(eq(teamMember.userId, existingMember.userId), inArray(teamMember.teamId, organizationTeamIds)))
    }

    await tx.delete(member).where(eq(member.id, memberId))
  })

  if (organizationTeamIds.length > 0) {
    await db
      .update(session)
      .set({
        activeOrganizationId: null,
        activeTeamId: null,
      })
      .where(
        and(
          eq(session.userId, existingMember.userId),
          or(
            eq(session.activeOrganizationId, existingMember.organizationId),
            inArray(session.activeTeamId, organizationTeamIds),
          ),
        ),
      )
  } else {
    await db
      .update(session)
      .set({
        activeOrganizationId: null,
        activeTeamId: null,
      })
      .where(
        and(eq(session.userId, existingMember.userId), eq(session.activeOrganizationId, existingMember.organizationId)),
      )
  }

  return {
    memberId: existingMember.id,
    organizationId: existingMember.organizationId,
    status: 'success' as const,
    userId: existingMember.userId,
  }
}
