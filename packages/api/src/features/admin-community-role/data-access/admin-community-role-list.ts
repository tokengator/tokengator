import { listCommunityRoleRecords } from '../../../features/community-role-sync'

import { adminCommunityRoleOrganizationRecordGet } from './admin-community-role-organization-record-get'

export async function adminCommunityRoleList(organizationId: string) {
  const existingOrganization = await adminCommunityRoleOrganizationRecordGet(organizationId)

  if (!existingOrganization) {
    return null
  }

  return {
    communityRoles: await listCommunityRoleRecords(organizationId),
  }
}
