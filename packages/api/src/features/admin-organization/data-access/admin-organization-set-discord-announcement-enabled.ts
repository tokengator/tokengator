import { setCommunityDiscordAnnouncementEnabled } from '../../../features/community-discord-announcement'

import type { AdminOrganizationSetDiscordAnnouncementEnabledInput } from './admin-organization-set-discord-announcement-enabled-input'
import { adminOrganizationRecordGet } from './admin-organization-record-get'

export async function adminOrganizationSetDiscordAnnouncementEnabled(
  input: AdminOrganizationSetDiscordAnnouncementEnabledInput,
) {
  const existingOrganization = await adminOrganizationRecordGet(input.organizationId)

  if (!existingOrganization) {
    return {
      status: 'organization-not-found' as const,
    }
  }

  const config = await setCommunityDiscordAnnouncementEnabled(input)

  if (!config) {
    return {
      status: 'discord-announcement-config-not-found' as const,
    }
  }

  return {
    config,
    status: 'success' as const,
  }
}
