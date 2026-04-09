import { upsertCommunityDiscordConnection } from '../../../features/community-discord-connection'

import type { AdminOrganizationUpsertDiscordConnectionInput } from './admin-organization-upsert-discord-connection-input'
import { adminOrganizationRecordGet } from './admin-organization-record-get'

export async function adminOrganizationUpsertDiscordConnection(input: AdminOrganizationUpsertDiscordConnectionInput) {
  const existingOrganization = await adminOrganizationRecordGet(input.organizationId)

  if (!existingOrganization) {
    return {
      status: 'organization-not-found' as const,
    }
  }

  return {
    connection: await upsertCommunityDiscordConnection({
      guildId: input.guildId,
      organizationId: input.organizationId,
    }),
    status: 'success' as const,
  }
}
