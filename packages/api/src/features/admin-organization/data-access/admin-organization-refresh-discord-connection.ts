import { refreshCommunityDiscordConnection } from '../../../features/community-discord-connection'

import { adminOrganizationRecordGet } from './admin-organization-record-get'

export async function adminOrganizationRefreshDiscordConnection(organizationId: string) {
  const existingOrganization = await adminOrganizationRecordGet(organizationId)

  if (!existingOrganization) {
    return {
      status: 'organization-not-found' as const,
    }
  }

  const connection = await refreshCommunityDiscordConnection(organizationId)

  if (!connection) {
    return {
      status: 'discord-connection-not-found' as const,
    }
  }

  return {
    connection,
    status: 'success' as const,
  }
}
