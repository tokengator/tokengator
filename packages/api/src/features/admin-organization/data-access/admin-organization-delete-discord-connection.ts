import { deleteCommunityDiscordConnectionByOrganizationId } from '../../../features/community-discord-connection'

import { adminOrganizationRecordGet } from './admin-organization-record-get'

export async function adminOrganizationDeleteDiscordConnection(organizationId: string) {
  const existingOrganization = await adminOrganizationRecordGet(organizationId)

  if (!existingOrganization) {
    return null
  }

  await deleteCommunityDiscordConnectionByOrganizationId(organizationId)

  return {
    organizationId,
  }
}
