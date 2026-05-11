import { upsertCommunityDiscordAnnouncementConfig } from '../../../features/community-discord-announcement'

import { adminOrganizationRecordGet } from './admin-organization-record-get'
import type { AdminOrganizationUpsertDiscordAnnouncementConfigInput } from './admin-organization-upsert-discord-announcement-config-input'

export async function adminOrganizationUpsertDiscordAnnouncementConfig(
  input: AdminOrganizationUpsertDiscordAnnouncementConfigInput,
) {
  const existingOrganization = await adminOrganizationRecordGet(input.organizationId)

  if (!existingOrganization) {
    return {
      status: 'organization-not-found' as const,
    }
  }

  return await upsertCommunityDiscordAnnouncementConfig(input)
}
