import { adminCommunityRoleDiscordGuildRolesGet } from './admin-community-role-discord-guild-roles-get'
import { adminCommunityRoleOrganizationRecordGet } from './admin-community-role-organization-record-get'

export async function adminCommunityRoleListDiscordGuildRoles(organizationId: string) {
  const existingOrganization = await adminCommunityRoleOrganizationRecordGet(organizationId)

  if (!existingOrganization) {
    return null
  }

  return await adminCommunityRoleDiscordGuildRolesGet(organizationId)
}
