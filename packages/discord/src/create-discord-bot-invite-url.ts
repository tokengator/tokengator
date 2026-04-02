import { OAuth2Scopes, PermissionFlagsBits } from 'discord.js'

import type { DiscordContext } from './discord-context'
import { getDiscordClientId, getOptionalDiscordGuildId } from './discord-env'

export interface CreateDiscordBotInviteUrlOptions {
  clientId?: string
  guildId?: string
}

export function createDiscordBotInviteUrl(
  ctx: Pick<DiscordContext, 'env'>,
  options: CreateDiscordBotInviteUrlOptions = {},
) {
  const clientId = getDiscordClientId(ctx, options.clientId)
  const guildId = getOptionalDiscordGuildId(ctx, options.guildId)
  const query = new URLSearchParams()

  query.set('client_id', clientId)

  if (guildId) {
    query.set('disable_guild_select', 'true')
    query.set('guild_id', guildId)
  }

  query.set('permissions', PermissionFlagsBits.ManageRoles.toString())
  query.set('scope', [OAuth2Scopes.ApplicationsCommands, OAuth2Scopes.Bot].join(' '))

  return `https://discord.com/oauth2/authorize?${query.toString()}`
}
