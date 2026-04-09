import { applyCommunityRoleSync } from '../../../features/community-role-sync'

import { adminCommunityRoleOrganizationRecordGet } from './admin-community-role-organization-record-get'

export async function adminCommunityRoleApplySync(organizationId: string) {
  const existingOrganization = await adminCommunityRoleOrganizationRecordGet(organizationId)

  if (!existingOrganization) {
    return null
  }

  return await applyCommunityRoleSync(organizationId)
}
