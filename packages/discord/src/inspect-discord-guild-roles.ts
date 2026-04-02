import { PermissionFlagsBits, REST, Routes } from 'discord.js'

import type { DiscordContext } from './discord-context'
import { getDiscordBotToken } from './discord-env'

export type DiscordGuildRoleCheck =
  | 'discord_role_hierarchy_blocked'
  | 'discord_role_is_default'
  | 'discord_role_managed'

export type DiscordGuildRoleInspectionCheck =
  | 'bot_identity_lookup_failed'
  | 'bot_not_in_guild'
  | 'bot_token_missing'
  | 'guild_fetch_failed'
  | 'guild_not_found'
  | 'guild_roles_fetch_failed'
  | 'manage_roles_missing'

export interface DiscordGuildRoleInspectionDiagnostics {
  botHighestRole: {
    id: string
    name: string | null
    position: number
  } | null
  checks: DiscordGuildRoleInspectionCheck[]
  guild: {
    id: string
    name: string | null
  }
  permissions: {
    administrator: boolean
    manageRoles: boolean
  }
}

export interface DiscordGuildRoleRecord {
  assignable: boolean
  checks: DiscordGuildRoleCheck[]
  id: string
  isDefault: boolean
  managed: boolean
  name: string
  position: number
}

export interface InspectDiscordGuildRolesOptions {
  guildId: string
  rest?: {
    get(route: string): Promise<unknown>
  }
  token?: string
}

export interface InspectDiscordGuildRolesResult {
  diagnostics: DiscordGuildRoleInspectionDiagnostics
  guildName: string | null
  lastCheckedAt: Date
  roles: DiscordGuildRoleRecord[]
  status: 'connected' | 'needs_attention'
}

type DiscordGuildMemberRecord = {
  permissions?: string
  roles?: string[]
}

type DiscordGuildRecord = {
  id?: string
  name?: string
}

type DiscordRoleApiRecord = {
  id?: string
  managed?: boolean
  name?: string
  permissions?: string
  position?: number
}

type DiscordUserRecord = {
  id?: string
}

function createBaseDiagnostics(guildId: string): DiscordGuildRoleInspectionDiagnostics {
  return {
    botHighestRole: null,
    checks: [],
    guild: {
      id: guildId,
      name: null,
    },
    permissions: {
      administrator: false,
      manageRoles: false,
    },
  }
}

function finalizeDiagnostics(input: {
  checks: Set<DiscordGuildRoleInspectionCheck>
  diagnostics: DiscordGuildRoleInspectionDiagnostics
  guildName: string | null
  lastCheckedAt: Date
  roles: DiscordGuildRoleRecord[]
}): InspectDiscordGuildRolesResult {
  const checks = [...input.checks].sort((left, right) => left.localeCompare(right))

  return {
    diagnostics: {
      botHighestRole: input.diagnostics.botHighestRole,
      checks,
      guild: input.diagnostics.guild,
      permissions: input.diagnostics.permissions,
    },
    guildName: input.guildName,
    lastCheckedAt: input.lastCheckedAt,
    roles: input.roles,
    status: checks.length === 0 ? 'connected' : 'needs_attention',
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

function getDiscordRolePosition(role: DiscordRoleApiRecord) {
  return typeof role.position === 'number' ? role.position : -1
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

function getEffectiveGuildPermissions(input: {
  fallbackPermissions?: string
  guildId: string
  memberRoleIds?: string[]
  roles: DiscordRoleApiRecord[]
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

function toDiscordGuildRoleRecord(input: {
  canManageRoles: boolean
  guildId: string
  role: DiscordRoleApiRecord
  topRolePosition: number | null
}): DiscordGuildRoleRecord | null {
  if (typeof input.role.id !== 'string') {
    return null
  }

  const checks = new Set<DiscordGuildRoleCheck>()
  const isDefault = input.role.id === input.guildId
  const managed = Boolean(input.role.managed)
  const position = getDiscordRolePosition(input.role)
  const topRolePosition = input.topRolePosition

  if (isDefault) {
    checks.add('discord_role_is_default')
  }

  if (managed) {
    checks.add('discord_role_managed')
  }

  if (topRolePosition === null || topRolePosition <= position) {
    checks.add('discord_role_hierarchy_blocked')
  }

  return {
    assignable:
      !isDefault && !managed && input.canManageRoles && topRolePosition !== null && topRolePosition > position,
    checks: [...checks].sort((left, right) => left.localeCompare(right)),
    id: input.role.id,
    isDefault,
    managed,
    name: typeof input.role.name === 'string' && input.role.name.trim() ? input.role.name : input.role.id,
    position,
  }
}

export async function inspectDiscordGuildRoles(
  ctx: Pick<DiscordContext, 'env'>,
  options: InspectDiscordGuildRolesOptions,
): Promise<InspectDiscordGuildRolesResult> {
  const checks = new Set<DiscordGuildRoleInspectionCheck>()
  const diagnostics = createBaseDiagnostics(options.guildId)
  const lastCheckedAt = new Date()
  let botUserId: string | null = null
  let guildMember: DiscordGuildMemberRecord
  let guildName: string | null = null
  let token: string

  try {
    token = getDiscordBotToken(ctx, options.token)
  } catch {
    checks.add('bot_token_missing')

    return finalizeDiagnostics({
      checks,
      diagnostics,
      guildName,
      lastCheckedAt,
      roles: [],
    })
  }

  const rest = options.rest ?? new REST({ version: '10' }).setToken(token)

  try {
    const currentUser = (await rest.get(Routes.user('@me'))) as DiscordUserRecord

    botUserId = typeof currentUser.id === 'string' ? currentUser.id : null

    if (!botUserId) {
      checks.add('bot_identity_lookup_failed')

      return finalizeDiagnostics({
        checks,
        diagnostics,
        guildName,
        lastCheckedAt,
        roles: [],
      })
    }
  } catch {
    checks.add('bot_identity_lookup_failed')

    return finalizeDiagnostics({
      checks,
      diagnostics,
      guildName,
      lastCheckedAt,
      roles: [],
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
      checks,
      diagnostics,
      guildName,
      lastCheckedAt,
      roles: [],
    })
  }

  try {
    guildMember = (await rest.get(Routes.guildMember(options.guildId, botUserId))) as DiscordGuildMemberRecord
  } catch (error) {
    checks.add(isDiscordMemberNotFoundError(error) ? 'bot_not_in_guild' : 'bot_identity_lookup_failed')

    return finalizeDiagnostics({
      checks,
      diagnostics,
      guildName,
      lastCheckedAt,
      roles: [],
    })
  }

  let guildRoles: DiscordRoleApiRecord[]

  try {
    const result = await rest.get(Routes.guildRoles(options.guildId))

    guildRoles = Array.isArray(result) ? (result as DiscordRoleApiRecord[]) : []
  } catch {
    checks.add('guild_roles_fetch_failed')

    return finalizeDiagnostics({
      checks,
      diagnostics,
      guildName,
      lastCheckedAt,
      roles: [],
    })
  }

  if (guildRoles.length === 0) {
    checks.add('guild_roles_fetch_failed')

    return finalizeDiagnostics({
      checks,
      diagnostics,
      guildName,
      lastCheckedAt,
      roles: [],
    })
  }

  const permissions = getEffectiveGuildPermissions({
    fallbackPermissions: guildMember.permissions,
    guildId: options.guildId,
    memberRoleIds: guildMember.roles,
    roles: guildRoles,
  })
  const activeRoleIds = new Set([options.guildId, ...(guildMember.roles ?? [])])
  const administrator = hasPermissionFlag(permissions, PermissionFlagsBits.Administrator)
  const manageRoles = administrator || hasPermissionFlag(permissions, PermissionFlagsBits.ManageRoles)
  const botHighestRole = guildRoles
    .filter((role) => typeof role.id === 'string' && activeRoleIds.has(role.id))
    .sort((left, right) => {
      return (
        getDiscordRolePosition(right) - getDiscordRolePosition(left) ||
        (left.name ?? '').localeCompare(right.name ?? '') ||
        (left.id ?? '').localeCompare(right.id ?? '')
      )
    })[0]

  diagnostics.botHighestRole =
    botHighestRole && typeof botHighestRole.id === 'string'
      ? {
          id: botHighestRole.id,
          name: typeof botHighestRole.name === 'string' ? botHighestRole.name : null,
          position: getDiscordRolePosition(botHighestRole),
        }
      : null
  diagnostics.permissions = {
    administrator,
    manageRoles,
  }

  if (!manageRoles) {
    checks.add('manage_roles_missing')
  }

  const roles = guildRoles
    .map((role) =>
      toDiscordGuildRoleRecord({
        canManageRoles: manageRoles,
        guildId: options.guildId,
        role,
        topRolePosition: diagnostics.botHighestRole?.position ?? null,
      }),
    )
    .filter((role): role is DiscordGuildRoleRecord => Boolean(role))
    .sort((left, right) => {
      return right.position - left.position || left.name.localeCompare(right.name) || left.id.localeCompare(right.id)
    })

  return finalizeDiagnostics({
    checks,
    diagnostics,
    guildName,
    lastCheckedAt,
    roles,
  })
}
