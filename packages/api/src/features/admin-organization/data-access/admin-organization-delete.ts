import { eq, inArray, or } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { invitation, member, organization, session, team, teamMember } from '@tokengator/db/schema/auth'
import { communityManagedMember } from '@tokengator/db/schema/community-role'

import { adminOrganizationRecordGet } from './admin-organization-record-get'
import { adminOrganizationTeamIdsList } from './admin-organization-team-ids-list'

export async function adminOrganizationDelete(organizationId: string) {
  const existingOrganization = await adminOrganizationRecordGet(organizationId)

  if (!existingOrganization) {
    return null
  }

  const organizationTeamIds = await adminOrganizationTeamIdsList(organizationId)

  await db.transaction(async (tx) => {
    await tx.delete(communityManagedMember).where(eq(communityManagedMember.organizationId, organizationId))
    await tx.delete(invitation).where(eq(invitation.organizationId, organizationId))

    if (organizationTeamIds.length > 0) {
      await tx.delete(teamMember).where(inArray(teamMember.teamId, organizationTeamIds))
      await tx.delete(team).where(inArray(team.id, organizationTeamIds))
    }

    await tx.delete(member).where(eq(member.organizationId, organizationId))
    await tx.delete(organization).where(eq(organization.id, organizationId))
  })

  if (organizationTeamIds.length > 0) {
    await db
      .update(session)
      .set({
        activeOrganizationId: null,
        activeTeamId: null,
      })
      .where(or(eq(session.activeOrganizationId, organizationId), inArray(session.activeTeamId, organizationTeamIds)))
  } else {
    await db
      .update(session)
      .set({
        activeOrganizationId: null,
        activeTeamId: null,
      })
      .where(eq(session.activeOrganizationId, organizationId))
  }

  return {
    organizationId,
  }
}
