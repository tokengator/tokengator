import { ChannelType, PermissionFlagsBits, REST, Routes } from 'discord.js'

import type { DiscordContext } from './discord-context'
import { getDiscordBotToken } from './discord-env'

export type DiscordGuildAnnouncementChannelCheck =
  | 'embed_links_missing'
  | 'send_messages_missing'
  | 'view_channel_missing'

export type DiscordGuildAnnouncementChannelInspectionCheck =
  | 'bot_identity_lookup_failed'
  | 'bot_not_in_guild'
  | 'bot_token_missing'
  | 'guild_channels_fetch_failed'
  | 'guild_fetch_failed'
  | 'guild_not_found'
  | 'guild_roles_fetch_failed'

export interface DiscordGuildAnnouncementChannelInspectionDiagnostics {
  checks: DiscordGuildAnnouncementChannelInspectionCheck[]
  guild: {
    id: string
    name: string | null
  }
  permissions: {
    administrator: boolean
  }
}

export interface DiscordGuildAnnouncementChannelRecord {
  canPost: boolean
  checks: DiscordGuildAnnouncementChannelCheck[]
  id: string
  name: string
  type: 'announcement' | 'text'
}

export interface InspectDiscordGuildAnnouncementChannelsOptions {
  guildId: string
  rest?: {
    get(route: string): Promise<unknown>
  }
  token?: string
}

export interface InspectDiscordGuildAnnouncementChannelsResult {
  channels: DiscordGuildAnnouncementChannelRecord[]
  diagnostics: DiscordGuildAnnouncementChannelInspectionDiagnostics
  guildName: string | null
  lastCheckedAt: Date
  status: 'connected' | 'needs_attention'
}

type DiscordChannelOverwriteRecord = {
  allow?: string
  deny?: string
  id?: string
  type?: number | string
}

type DiscordGuildAnnouncementChannelApiRecord = {
  id?: string
  name?: string
  permission_overwrites?: DiscordChannelOverwriteRecord[]
  type?: number
}

type DiscordGuildMemberRecord = {
  permissions?: string
  roles?: string[]
}

type DiscordGuildRecord = {
  id?: string
  name?: string
}

type DiscordRoleRecord = {
  id?: string
  permissions?: string
}

type DiscordUserRecord = {
  id?: string
}

function applyPermissionOverwrite(basePermissions: bigint, overwrite: { allow?: string; deny?: string }) {
  const allow = BigInt(overwrite.allow ?? '0')
  const deny = BigInt(overwrite.deny ?? '0')

  return (basePermissions & ~deny) | allow
}

function createBaseDiagnostics(guildId: string): DiscordGuildAnnouncementChannelInspectionDiagnostics {
  return {
    checks: [],
    guild: {
      id: guildId,
      name: null,
    },
    permissions: {
      administrator: false,
    },
  }
}

function finalizeDiagnostics(input: {
  channels: DiscordGuildAnnouncementChannelRecord[]
  checks: Set<DiscordGuildAnnouncementChannelInspectionCheck>
  diagnostics: DiscordGuildAnnouncementChannelInspectionDiagnostics
  guildName: string | null
  lastCheckedAt: Date
}): InspectDiscordGuildAnnouncementChannelsResult {
  const checks = [...input.checks].sort((left, right) => left.localeCompare(right))
  const hasPostableChannel = input.channels.some((channel) => channel.canPost)

  return {
    channels: input.channels,
    diagnostics: {
      checks,
      guild: input.diagnostics.guild,
      permissions: input.diagnostics.permissions,
    },
    guildName: input.guildName,
    lastCheckedAt: input.lastCheckedAt,
    status: checks.length === 0 && hasPostableChannel ? 'connected' : 'needs_attention',
  }
}

function getDiscordErrorCode(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null
  }

  return typeof error.code === 'number' ? error.code : null
}

function getDiscordErrorStatus(error: unknown) {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return null
  }

  return typeof error.status === 'number' ? error.status : null
}

function getEffectiveGuildPermissions(input: {
  fallbackPermissions?: string
  guildId: string
  memberRoleIds?: string[]
  roles: DiscordRoleRecord[]
}) {
  if (typeof input.fallbackPermissions === 'string') {
    return BigInt(input.fallbackPermissions)
  }

  const activeRoleIds = new Set([input.guildId, ...(input.memberRoleIds ?? [])])

  return input.roles.reduce((permissions, role) => {
    if (typeof role.id !== 'string' || !activeRoleIds.has(role.id)) {
      return permissions
    }

    return permissions | BigInt(typeof role.permissions === 'string' ? role.permissions : '0')
  }, 0n)
}

function hasPermissionFlag(permissions: bigint, requiredPermission: bigint) {
  return (permissions & requiredPermission) === requiredPermission
}

function isDiscordGuildNotFoundError(error: unknown) {
  return getDiscordErrorCode(error) === 10_004 || getDiscordErrorStatus(error) === 404
}

function isDiscordMemberNotFoundError(error: unknown) {
  return getDiscordErrorCode(error) === 10_007 || getDiscordErrorStatus(error) === 404
}

function sortAnnouncementChannels(channels: DiscordGuildAnnouncementChannelRecord[]) {
  return [...channels].sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id))
}

function toAnnouncementChannelRecord(input: {
  basePermissions: bigint
  channel: DiscordGuildAnnouncementChannelApiRecord
  guildId: string
  memberRoleIds: string[]
  memberUserId: string
}) {
  if (
    typeof input.channel.id !== 'string' ||
    (input.channel.type !== ChannelType.GuildAnnouncement && input.channel.type !== ChannelType.GuildText)
  ) {
    return null
  }

  let permissions = input.basePermissions
  const overwrites = input.channel.permission_overwrites ?? []
  const everyoneOverwrite = overwrites.find((overwrite) => overwrite.id === input.guildId)
  const roleOverwrites = overwrites.filter(
    (overwrite) =>
      typeof overwrite.id === 'string' &&
      overwrite.id !== input.guildId &&
      input.memberRoleIds.includes(overwrite.id) &&
      overwrite.type !== 1 &&
      overwrite.type !== '1' &&
      overwrite.type !== 'member',
  )
  const memberOverwrite = overwrites.find(
    (overwrite) =>
      overwrite.id === input.memberUserId &&
      (overwrite.type === 1 || overwrite.type === '1' || overwrite.type === 'member' || overwrite.type === 'Member'),
  )

  if (everyoneOverwrite) {
    permissions = applyPermissionOverwrite(permissions, everyoneOverwrite)
  }

  if (roleOverwrites.length > 0) {
    const roleAllow = roleOverwrites.reduce(
      (accumulator, overwrite) => accumulator | BigInt(overwrite.allow ?? '0'),
      0n,
    )
    const roleDeny = roleOverwrites.reduce((accumulator, overwrite) => accumulator | BigInt(overwrite.deny ?? '0'), 0n)

    permissions = applyPermissionOverwrite(permissions, {
      allow: roleAllow.toString(),
      deny: roleDeny.toString(),
    })
  }

  if (memberOverwrite) {
    permissions = applyPermissionOverwrite(permissions, memberOverwrite)
  }

  const administrator = hasPermissionFlag(permissions, PermissionFlagsBits.Administrator)
  const canEmbedLinks = administrator || hasPermissionFlag(permissions, PermissionFlagsBits.EmbedLinks)
  const canSendMessages = administrator || hasPermissionFlag(permissions, PermissionFlagsBits.SendMessages)
  const canViewChannel = administrator || hasPermissionFlag(permissions, PermissionFlagsBits.ViewChannel)
  const checks = new Set<DiscordGuildAnnouncementChannelCheck>()

  if (!canEmbedLinks) {
    checks.add('embed_links_missing')
  }

  if (!canSendMessages) {
    checks.add('send_messages_missing')
  }

  if (!canViewChannel) {
    checks.add('view_channel_missing')
  }

  return {
    canPost: canEmbedLinks && canSendMessages && canViewChannel,
    checks: [...checks].sort((left, right) => left.localeCompare(right)),
    id: input.channel.id,
    name: typeof input.channel.name === 'string' && input.channel.name.trim() ? input.channel.name : input.channel.id,
    type: input.channel.type === ChannelType.GuildAnnouncement ? 'announcement' : 'text',
  } satisfies DiscordGuildAnnouncementChannelRecord
}

export async function inspectDiscordGuildAnnouncementChannels(
  ctx: Pick<DiscordContext, 'env'>,
  options: InspectDiscordGuildAnnouncementChannelsOptions,
): Promise<InspectDiscordGuildAnnouncementChannelsResult> {
  const checks = new Set<DiscordGuildAnnouncementChannelInspectionCheck>()
  const diagnostics = createBaseDiagnostics(options.guildId)
  const lastCheckedAt = new Date()
  let guildName: string | null = null
  let token: string

  try {
    token = getDiscordBotToken(ctx, options.token)
  } catch {
    checks.add('bot_token_missing')

    return finalizeDiagnostics({
      channels: [],
      checks,
      diagnostics,
      guildName,
      lastCheckedAt,
    })
  }

  const rest = options.rest ?? new REST({ version: '10' }).setToken(token)
  let botUserId: string | null = null

  try {
    const currentUser = (await rest.get(Routes.user('@me'))) as DiscordUserRecord
    botUserId = typeof currentUser.id === 'string' ? currentUser.id : null

    if (!botUserId) {
      checks.add('bot_identity_lookup_failed')

      return finalizeDiagnostics({
        channels: [],
        checks,
        diagnostics,
        guildName,
        lastCheckedAt,
      })
    }
  } catch {
    checks.add('bot_identity_lookup_failed')

    return finalizeDiagnostics({
      channels: [],
      checks,
      diagnostics,
      guildName,
      lastCheckedAt,
    })
  }

  try {
    const guild = (await rest.get(Routes.guild(options.guildId))) as DiscordGuildRecord

    guildName = typeof guild.name === 'string' ? guild.name : null
    diagnostics.guild = {
      id: options.guildId,
      name: guildName,
    }
  } catch (error) {
    checks.add(isDiscordGuildNotFoundError(error) ? 'guild_not_found' : 'guild_fetch_failed')

    return finalizeDiagnostics({
      channels: [],
      checks,
      diagnostics,
      guildName,
      lastCheckedAt,
    })
  }

  let guildMember: DiscordGuildMemberRecord
  let guildRoles: DiscordRoleRecord[]
  let guildChannels: DiscordGuildAnnouncementChannelApiRecord[]

  try {
    guildMember = (await rest.get(Routes.guildMember(options.guildId, botUserId))) as DiscordGuildMemberRecord
  } catch (error) {
    checks.add(isDiscordMemberNotFoundError(error) ? 'bot_not_in_guild' : 'bot_identity_lookup_failed')

    return finalizeDiagnostics({
      channels: [],
      checks,
      diagnostics,
      guildName,
      lastCheckedAt,
    })
  }

  try {
    guildRoles = (await rest.get(Routes.guildRoles(options.guildId))) as DiscordRoleRecord[]
  } catch {
    checks.add('guild_roles_fetch_failed')

    return finalizeDiagnostics({
      channels: [],
      checks,
      diagnostics,
      guildName,
      lastCheckedAt,
    })
  }

  try {
    guildChannels = (await rest.get(
      Routes.guildChannels(options.guildId),
    )) as DiscordGuildAnnouncementChannelApiRecord[]
  } catch {
    checks.add('guild_channels_fetch_failed')

    return finalizeDiagnostics({
      channels: [],
      checks,
      diagnostics,
      guildName,
      lastCheckedAt,
    })
  }

  const basePermissions = getEffectiveGuildPermissions({
    fallbackPermissions: guildMember.permissions,
    guildId: options.guildId,
    memberRoleIds: guildMember.roles,
    roles: guildRoles,
  })
  const administrator = hasPermissionFlag(basePermissions, PermissionFlagsBits.Administrator)

  diagnostics.permissions = {
    administrator,
  }

  return finalizeDiagnostics({
    channels: sortAnnouncementChannels(
      guildChannels
        .map((channel) =>
          toAnnouncementChannelRecord({
            basePermissions,
            channel,
            guildId: options.guildId,
            memberRoleIds: guildMember.roles ?? [],
            memberUserId: botUserId,
          }),
        )
        .filter((channel): channel is DiscordGuildAnnouncementChannelRecord => channel !== null),
    ),
    checks,
    diagnostics,
    guildName,
    lastCheckedAt,
  })
}
