import { upsertCommunityDiscordConnection } from '../../../features/community-discord-connection'

import { adminOrganizationRecordGet } from './admin-organization-record-get'
import type { AdminOrganizationUpsertDiscordConnectionInput } from './admin-organization-upsert-discord-connection-input'

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
