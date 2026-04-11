import { adminOrganizationMemberRecordGet } from '../../admin-organization/data-access/admin-organization-member-record-get'
import { adminOrganizationRemoveMember } from '../../admin-organization/data-access/admin-organization-remove-member'

export async function adminUserRemoveCommunityMembership(input: { memberId: string; userId: string }) {
  const existingMember = await adminOrganizationMemberRecordGet(input.memberId)

  if (!existingMember || existingMember.userId !== input.userId) {
    return {
      status: 'member-not-found' as const,
    }
  }

  return await adminOrganizationRemoveMember(input.memberId)
}
