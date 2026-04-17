import { getCommunityDiscordAnnouncementCatalog } from '../../../features/community-discord-announcement'

import { adminOrganizationRecordGet } from './admin-organization-record-get'

export async function adminOrganizationGetDiscordAnnouncementCatalog(organizationId: string) {
  const existingOrganization = await adminOrganizationRecordGet(organizationId)

  if (!existingOrganization) {
    return {
      status: 'organization-not-found' as const,
    }
  }

  return {
    catalog: await getCommunityDiscordAnnouncementCatalog(organizationId),
    status: 'success' as const,
  }
}
