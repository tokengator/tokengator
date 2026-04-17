import { upsertCommunityDiscordAnnouncementConfig } from '../../../features/community-discord-announcement'

import type { AdminOrganizationUpsertDiscordAnnouncementConfigInput } from './admin-organization-upsert-discord-announcement-config-input'
import { adminOrganizationRecordGet } from './admin-organization-record-get'

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
