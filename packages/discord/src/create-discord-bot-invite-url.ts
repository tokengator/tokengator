import { OAuth2Scopes } from 'discord.js'

import { getDiscordClientId, getOptionalDiscordGuildId } from './discord-env'

export interface CreateDiscordBotInviteUrlOptions {
  clientId?: string
  guildId?: string
}

export function createDiscordBotInviteUrl(options: CreateDiscordBotInviteUrlOptions = {}) {
  const clientId = getDiscordClientId(options.clientId)
  const guildId = getOptionalDiscordGuildId(options.guildId)
  const query = new URLSearchParams()

  query.set('client_id', clientId)

  if (guildId) {
    query.set('disable_guild_select', 'true')
    query.set('guild_id', guildId)
  }

  query.set('permissions', '0')
  query.set('scope', [OAuth2Scopes.ApplicationsCommands, OAuth2Scopes.Bot].join(' '))

  return `https://discord.com/oauth2/authorize?${query.toString()}`
}
