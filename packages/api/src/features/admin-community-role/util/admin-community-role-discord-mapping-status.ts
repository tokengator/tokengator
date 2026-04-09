import type {
  DiscordGuildRoleInspectionCheck,
  DiscordGuildRoleRecord,
} from '@tokengator/discord/inspect-discord-guild-roles'

import type {
  AdminCommunityRoleDiscordGuildRolesResult,
  AdminCommunityRoleDiscordMappingStatus,
} from '../data-access/admin-community-role.entity'

export const adminCommunityRoleBlockingDiscordGuildRoleChecks = new Set<DiscordGuildRoleInspectionCheck>([
  'bot_identity_lookup_failed',
  'bot_not_in_guild',
  'bot_token_missing',
  'guild_fetch_failed',
  'guild_not_found',
  'guild_roles_fetch_failed',
])

export const adminCommunityRoleDiscordGuildRoleInspectionCheckMessages: Record<
  DiscordGuildRoleInspectionCheck,
  string
> = {
  bot_identity_lookup_failed: 'TokenGator could not identify the Discord bot account.',
  bot_not_in_guild: 'The Discord bot must join this server before roles can be mapped.',
  bot_token_missing: 'The Discord bot token is not configured for the API environment.',
  guild_fetch_failed: 'TokenGator could not load the Discord server details.',
  guild_not_found: 'The connected Discord server could not be found.',
  guild_roles_fetch_failed: 'TokenGator could not load the Discord role list for this server.',
  manage_roles_missing: 'The Discord bot is missing the Manage Roles permission.',
}

export function adminCommunityRoleCreateDiscordMappingStatus(input: {
  connection: AdminCommunityRoleDiscordGuildRolesResult['connection']
  discordRoleId: string | null
  guildRole: DiscordGuildRoleRecord | null
}): AdminCommunityRoleDiscordMappingStatus {
  if (!input.discordRoleId) {
    return {
      checks: [],
      status: 'not_mapped',
    }
  }

  if (!input.connection) {
    return {
      checks: ['discord_connection_missing'],
      status: 'needs_attention',
    }
  }

  if (!input.guildRole) {
    return {
      checks: ['discord_role_not_found'],
      status: 'needs_attention',
    }
  }

  const checks = [
    ...new Set(
      [...input.connection.diagnostics.checks, ...input.guildRole.checks].sort((left, right) =>
        left.localeCompare(right),
      ),
    ),
  ]

  return {
    checks,
    status: input.guildRole.assignable && checks.length === 0 ? 'ready' : 'needs_attention',
  }
}
