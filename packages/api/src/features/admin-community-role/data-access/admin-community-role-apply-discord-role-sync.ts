import { getCommunityDiscordConnectionByOrganizationId } from '../../../features/community-discord-connection'
import { applyCommunityRoleDiscordSync } from '../../../features/community-role-sync'

import { adminCommunityRoleOrganizationRecordGet } from './admin-community-role-organization-record-get'

export async function adminCommunityRoleApplyDiscordRoleSync(organizationId: string) {
  const existingOrganization = await adminCommunityRoleOrganizationRecordGet(organizationId)

  if (!existingOrganization) {
    return {
      status: 'organization-not-found' as const,
    }
  }

  const existingConnection = await getCommunityDiscordConnectionByOrganizationId(organizationId)

  if (!existingConnection) {
    return {
      status: 'discord-connection-not-found' as const,
    }
  }

  return {
    result: await applyCommunityRoleDiscordSync(organizationId),
    status: 'success' as const,
  }
}
