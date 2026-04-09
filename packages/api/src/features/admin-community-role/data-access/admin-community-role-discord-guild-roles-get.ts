import { inspectDiscordGuildRoles } from '@tokengator/discord/inspect-discord-guild-roles'
import { env } from '@tokengator/env/api'

import { getCommunityDiscordConnectionByOrganizationId } from '../../../features/community-discord-connection'

import type { AdminCommunityRoleDiscordGuildRolesResult } from './admin-community-role.entity'

export async function adminCommunityRoleDiscordGuildRolesGet(
  organizationId: string,
): Promise<AdminCommunityRoleDiscordGuildRolesResult> {
  const connection = await getCommunityDiscordConnectionByOrganizationId(organizationId)

  if (!connection) {
    return {
      connection: null,
      guildRoles: [],
    }
  }

  const inspection = await inspectDiscordGuildRoles(
    {
      env,
    },
    {
      guildId: connection.guildId,
    },
  )

  return {
    connection: {
      diagnostics: inspection.diagnostics,
      guildId: connection.guildId,
      guildName: inspection.guildName ?? connection.guildName,
      lastCheckedAt: inspection.lastCheckedAt,
      status: inspection.status,
    },
    guildRoles: inspection.roles,
  }
}
