import { and, eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { member } from '@tokengator/db/schema/auth'
import { communityManagedMember } from '@tokengator/db/schema/community-role'

import { adminOrganizationHasOwnerRole } from '../util/admin-organization-owner-role'

import type { AdminOrganizationMemberRole } from './admin-organization-member-role'
import { adminOrganizationMemberRecordGet } from './admin-organization-member-record-get'
import { adminOrganizationOwnerCount } from './admin-organization-owner-count'

export async function adminOrganizationUpdateMemberRole(input: {
  memberId: string
  role: AdminOrganizationMemberRole
}) {
  const existingMember = await adminOrganizationMemberRecordGet(input.memberId)

  if (!existingMember) {
    return {
      status: 'member-not-found' as const,
    }
  }

  if (adminOrganizationHasOwnerRole(existingMember.role) && input.role !== 'owner') {
    const ownerCount = await adminOrganizationOwnerCount(existingMember.organizationId)

    if (ownerCount <= 1) {
      return {
        status: 'last-owner' as const,
      }
    }
  }

  await db
    .update(member)
    .set({
      role: input.role,
    })
    .where(eq(member.id, input.memberId))
  await db
    .delete(communityManagedMember)
    .where(
      and(
        eq(communityManagedMember.organizationId, existingMember.organizationId),
        eq(communityManagedMember.userId, existingMember.userId),
      ),
    )

  return {
    memberId: existingMember.id,
    organizationId: existingMember.organizationId,
    role: input.role,
    status: 'success' as const,
  }
}
