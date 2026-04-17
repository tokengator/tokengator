export function formatAdminCommunityDiscordCheck(
  check: string,
  options?: {
    botHighestRolePosition?: number | null
    guildRolePosition?: number | null
  },
) {
  if (
    check === 'discord_role_hierarchy_blocked' &&
    options?.botHighestRolePosition !== null &&
    options?.botHighestRolePosition !== undefined &&
    options?.guildRolePosition !== null &&
    options?.guildRolePosition !== undefined &&
    options.botHighestRolePosition === options.guildRolePosition
  ) {
    return 'The bot role is on the same level as this Discord role. Move the bot role above it in the server hierarchy.'
  }

  return adminCommunityDiscordCheckLabels[check] ?? check.replaceAll('_', ' ')
}

const adminCommunityDiscordCheckLabels: Record<string, string> = {
  already_correct: 'Discord role is already correct.',
  bot_identity_lookup_failed: 'TokenGator could not identify the Discord bot account.',
  bot_not_in_guild: 'The Discord bot is not a member of this server yet.',
  bot_token_missing: 'The Discord bot token is not configured for the API environment.',
  channel_not_found: 'The selected Discord channel no longer exists in the connected server.',
  commands_registration_failed: 'Guild slash command registration failed for this server.',
  discord_api_failure: 'Discord API request failed during reconcile.',
  discord_connection_missing: 'Connect a Discord server for this community before mapping roles.',
  discord_role_hierarchy_blocked: 'The bot role must be above this Discord role in the server hierarchy.',
  discord_role_is_default: 'The @everyone role cannot be used for TokenGator role mapping.',
  discord_role_managed: 'Managed or integration-owned Discord roles cannot be used for TokenGator role mapping.',
  discord_role_not_found: 'The mapped Discord role no longer exists in the connected server.',
  discord_validation_unavailable: 'Discord role validation is unavailable right now.',
  embed_links_missing: 'The Discord bot cannot send embeds in this channel.',
  guild_channels_fetch_failed: 'TokenGator could not load the Discord channel list for this server.',
  guild_fetch_failed: 'TokenGator could not load the Discord server details.',
  guild_not_found: 'The Discord server could not be found from the configured guild ID.',
  guild_roles_fetch_failed: 'TokenGator could not load the Discord role list for this server.',
  linked_but_not_in_guild: 'This linked Discord account is not in the connected server.',
  manage_roles_missing: 'The Discord bot is missing the Manage Roles permission.',
  mapping_missing: 'This TokenGator role is not mapped to a Discord role yet.',
  mapping_not_assignable: 'The mapped Discord role is not assignable by the bot right now.',
  no_discord_account_linked: 'This user has no linked Discord account.',
  send_messages_missing: 'The Discord bot cannot send messages in this channel.',
  view_channel_missing: 'The Discord bot cannot view this channel.',
  will_grant: 'Discord role will be granted.',
  will_revoke: 'Discord role will be revoked.',
}
