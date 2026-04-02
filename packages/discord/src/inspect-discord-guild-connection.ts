import { PermissionFlagsBits, REST, Routes } from 'discord.js'

import type { DiscordContext } from './discord-context'
import { getDiscordBotToken } from './discord-env'
import { registerDiscordCommands } from './register-discord-commands'

export type DiscordGuildConnectionCheck =
  | 'bot_identity_lookup_failed'
  | 'bot_not_in_guild'
  | 'bot_token_missing'
  | 'commands_registration_failed'
  | 'guild_fetch_failed'
  | 'guild_not_found'
  | 'manage_roles_missing'

export interface DiscordGuildConnectionDiagnostics {
  checks: DiscordGuildConnectionCheck[]
  commands: {
    errorMessage: string | null
    registered: boolean
  }
  guild: {
    id: string
    name: string | null
  }
  permissions: {
    administrator: boolean
    manageRoles: boolean
  }
}

export interface InspectDiscordGuildConnectionOptions {
  guildId: string
  registerCommands?: typeof registerDiscordCommands
  rest?: {
    get(route: string): Promise<unknown>
  }
  token?: string
}

export interface InspectDiscordGuildConnectionResult {
  diagnostics: DiscordGuildConnectionDiagnostics
  guildName: string | null
  lastCheckedAt: Date
  status: 'connected' | 'needs_attention'
}

type DiscordGuildRecord = {
  id?: string
  name?: string
}

type DiscordGuildMemberRecord = {
  permissions?: string
  roles?: string[]
}

type DiscordRoleRecord = {
  id?: string
  permissions?: string
}

type DiscordUserRecord = {
  id?: string
}

function createBaseDiagnostics(guildId: string): DiscordGuildConnectionDiagnostics {
  return {
    checks: [],
    commands: {
      errorMessage: null,
      registered: false,
    },
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
  checks: Set<DiscordGuildConnectionCheck>
  diagnostics: DiscordGuildConnectionDiagnostics
  guildName: string | null
  lastCheckedAt: Date
}): InspectDiscordGuildConnectionResult {
  const checks = [...input.checks].sort((left, right) => left.localeCompare(right))

  return {
    diagnostics: {
      checks,
      commands: input.diagnostics.commands,
      guild: input.diagnostics.guild,
      permissions: input.diagnostics.permissions,
    },
    guildName: input.guildName,
    lastCheckedAt: input.lastCheckedAt,
    status: checks.length === 0 ? 'connected' : 'needs_attention',
  }
}

function getDiscordErrorCode(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null
  }

  return typeof error.code === 'number' ? error.code : null
}

function getDiscordErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Discord request failed.'
}

function getDiscordErrorStatus(error: unknown) {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return null
  }

  return typeof error.status === 'number' ? error.status : null
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

export async function inspectDiscordGuildConnection(
  ctx: Pick<DiscordContext, 'env'>,
  options: InspectDiscordGuildConnectionOptions,
): Promise<InspectDiscordGuildConnectionResult> {
  const checks = new Set<DiscordGuildConnectionCheck>()
  const diagnostics = createBaseDiagnostics(options.guildId)
  const lastCheckedAt = new Date()
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
        checks,
        diagnostics,
        guildName,
        lastCheckedAt,
      })
    }
  } catch {
    checks.add('bot_identity_lookup_failed')

    return finalizeDiagnostics({
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
      checks,
      diagnostics,
      guildName,
      lastCheckedAt,
    })
  }

  try {
    const [guildMember, guildRoles] = await Promise.all([
      rest.get(Routes.guildMember(options.guildId, botUserId)) as Promise<DiscordGuildMemberRecord>,
      rest.get(Routes.guildRoles(options.guildId)) as Promise<DiscordRoleRecord[]>,
    ])
    const permissions = getEffectiveGuildPermissions({
      fallbackPermissions: guildMember.permissions,
      guildId: options.guildId,
      memberRoleIds: guildMember.roles,
      roles: guildRoles,
    })
    const administrator = hasPermissionFlag(permissions, PermissionFlagsBits.Administrator)
    const manageRoles = administrator || hasPermissionFlag(permissions, PermissionFlagsBits.ManageRoles)

    diagnostics.permissions = {
      administrator,
      manageRoles,
    }

    if (!manageRoles) {
      checks.add('manage_roles_missing')
    }
  } catch (error) {
    checks.add(isDiscordMemberNotFoundError(error) ? 'bot_not_in_guild' : 'bot_identity_lookup_failed')

    return finalizeDiagnostics({
      checks,
      diagnostics,
      guildName,
      lastCheckedAt,
    })
  }

  try {
    await (options.registerCommands ?? registerDiscordCommands)(ctx, {
      guildId: options.guildId,
      token,
    })

    diagnostics.commands = {
      errorMessage: null,
      registered: true,
    }
  } catch (error) {
    diagnostics.commands = {
      errorMessage: getDiscordErrorMessage(error),
      registered: false,
    }
    checks.add('commands_registration_failed')
  }

  return finalizeDiagnostics({
    checks,
    diagnostics,
    guildName,
    lastCheckedAt,
  })
}
