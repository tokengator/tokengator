import type { RESTGetAPIGuildRolesResult, RESTPostAPIGuildRoleJSONBody, RESTPostAPIGuildRoleResult } from 'discord.js'
import { REST, Routes } from 'discord.js'

import type { DiscordContext } from './discord-context'
import { getDiscordBotToken, getDiscordGuildId } from './discord-env'

export interface DiscordRoleRestClient {
  get(route: string): Promise<unknown>
  post(route: string, options: { body?: unknown }): Promise<unknown>
}

type DiscordRoleRecord = RESTGetAPIGuildRolesResult[number]

export interface DiscordRoleProvisioningState {
  guildId: string
  rest: DiscordRoleRestClient
  rolesByName: Map<string, DiscordRoleRecord>
}

export interface EnsureDiscordRoleOptions {
  guildId?: string
  name: string
  state?: DiscordRoleProvisioningState
  token?: string
}

export interface EnsureDiscordRoleResult {
  created: boolean
  roleId: string
  roleName: string
}

export interface ListDiscordRolesOptions {
  guildId?: string
  rest?: DiscordRoleRestClient
  token?: string
}

function getDiscordRoleRestClient(
  ctx: Pick<DiscordContext, 'env'>,
  options: { rest?: DiscordRoleRestClient; token?: string },
): DiscordRoleRestClient {
  if (options.rest) {
    return options.rest
  }

  const token = getDiscordBotToken(ctx, options.token)

  return new REST({ version: '10' }).setToken(token)
}

export async function listDiscordRoles(
  ctx: Pick<DiscordContext, 'env'>,
  options: ListDiscordRolesOptions = {},
): Promise<DiscordRoleProvisioningState> {
  const guildId = getDiscordGuildId(ctx, options.guildId)
  const rest = getDiscordRoleRestClient(ctx, options)
  const roles = (await rest.get(Routes.guildRoles(guildId))) as RESTGetAPIGuildRolesResult

  return {
    guildId,
    rest,
    rolesByName: new Map([...roles].reverse().map((role) => [role.name, role] as const)),
  }
}

export async function ensureDiscordRole(
  ctx: Pick<DiscordContext, 'env'>,
  options: EnsureDiscordRoleOptions,
): Promise<EnsureDiscordRoleResult> {
  const guildId = getDiscordGuildId(ctx, options.guildId)

  if (options.state && options.state.guildId !== guildId) {
    throw new Error(
      `Discord role provisioning state guild mismatch: expected ${guildId}, received ${options.state.guildId}`,
    )
  }

  const rest = options.state?.rest ?? getDiscordRoleRestClient(ctx, options)
  const matchingRole = options.state
    ? options.state.rolesByName.get(options.name)
    : ((await rest.get(Routes.guildRoles(guildId))) as RESTGetAPIGuildRolesResult).find(
        (role) => role.name === options.name,
      )

  if (matchingRole) {
    return {
      created: false,
      roleId: matchingRole.id,
      roleName: matchingRole.name,
    }
  }

  const role = (await rest.post(Routes.guildRoles(guildId), {
    body: {
      name: options.name,
    } satisfies RESTPostAPIGuildRoleJSONBody,
  })) as RESTPostAPIGuildRoleResult

  options.state?.rolesByName.set(role.name, role)

  return {
    created: true,
    roleId: role.id,
    roleName: role.name,
  }
}
