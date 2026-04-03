import { REST, Routes } from 'discord.js'

import type { DiscordContext } from './discord-context'
import { getDiscordBotToken } from './discord-env'

const DISCORD_GUILD_MEMBERS_PAGE_SIZE = 1000
const discordGuildMemberRoleRestClientsByToken = new Map<string, DiscordGuildMemberRoleRestClient>()

export type DiscordGuildMemberRoleMutationErrorCode =
  | 'forbidden'
  | 'guild_member_not_found'
  | 'rate_limited'
  | 'role_not_found'
  | 'unknown'

export type DiscordGuildMemberLookupErrorCode = 'forbidden' | 'rate_limited' | 'unknown'

export interface DiscordGuildMemberRecord {
  discordUserId: string
  roleIds: string[]
}

export interface DiscordGuildMemberRoleRestClient {
  delete(route: string): Promise<unknown>
  get(route: string): Promise<unknown>
  put(route: string, options?: { reason?: string }): Promise<unknown>
}

export class DiscordGuildMemberRoleMutationError extends Error {
  readonly code: DiscordGuildMemberRoleMutationErrorCode
  readonly discordCode: number | null
  readonly status: number | null

  constructor(input: {
    code: DiscordGuildMemberRoleMutationErrorCode
    discordCode: number | null
    message: string
    status: number | null
  }) {
    super(input.message)
    this.code = input.code
    this.discordCode = input.discordCode
    this.name = 'DiscordGuildMemberRoleMutationError'
    this.status = input.status
  }
}

export class DiscordGuildMemberLookupError extends Error {
  readonly code: DiscordGuildMemberLookupErrorCode
  readonly discordCode: number | null
  readonly status: number | null

  constructor(input: {
    code: DiscordGuildMemberLookupErrorCode
    discordCode: number | null
    message: string
    status: number | null
  }) {
    super(input.message)
    this.code = input.code
    this.discordCode = input.discordCode
    this.name = 'DiscordGuildMemberLookupError'
    this.status = input.status
  }
}

export interface DiscordGuildMemberRoleMutationOptions {
  guildId: string
  reason?: string
  rest?: DiscordGuildMemberRoleRestClient
  roleId: string
  token?: string
  userId: string
}

export interface ListDiscordGuildMembersOptions {
  guildId: string
  rest?: Pick<DiscordGuildMemberRoleRestClient, 'get'>
  token?: string
}

export interface GetDiscordGuildMemberOptions {
  guildId: string
  rest?: Pick<DiscordGuildMemberRoleRestClient, 'get'>
  token?: string
  userId: string
}

type DiscordGuildMemberApiRecord = {
  roles?: string[]
  user?: {
    id?: string
  }
}

function buildGuildMembersRoute(guildId: string, after?: string) {
  const searchParams = new URLSearchParams({
    limit: DISCORD_GUILD_MEMBERS_PAGE_SIZE.toString(),
  })

  if (after) {
    searchParams.set('after', after)
  }

  return `${Routes.guildMembers(guildId)}?${searchParams.toString()}` as `/${string}`
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

function getDiscordGuildMemberRoleRestClient(
  ctx: Pick<DiscordContext, 'env'>,
  options: { rest?: Partial<DiscordGuildMemberRoleRestClient>; token?: string },
) {
  if (options.rest?.get && options.rest?.put && options.rest?.delete) {
    return options.rest as DiscordGuildMemberRoleRestClient
  }

  const token = getDiscordBotToken(ctx, options.token)
  const existingRestClient = discordGuildMemberRoleRestClientsByToken.get(token)

  if (existingRestClient) {
    return existingRestClient
  }

  const restClient = new REST({ version: '10' }).setToken(token)

  discordGuildMemberRoleRestClientsByToken.set(token, restClient)

  return restClient
}

function isDiscordGuildMemberNotFoundError(error: unknown) {
  return getDiscordErrorCode(error) === 10_007
}

function isDiscordRoleNotFoundError(error: unknown) {
  return getDiscordErrorCode(error) === 10_011
}

function toDiscordGuildMemberLookupError(error: unknown) {
  const code = getDiscordErrorCode(error)
  const status = getDiscordErrorStatus(error)

  if (status === 403) {
    return new DiscordGuildMemberLookupError({
      code: 'forbidden',
      discordCode: code,
      message: getDiscordErrorMessage(error),
      status,
    })
  }

  if (status === 429) {
    return new DiscordGuildMemberLookupError({
      code: 'rate_limited',
      discordCode: code,
      message: getDiscordErrorMessage(error),
      status,
    })
  }

  return new DiscordGuildMemberLookupError({
    code: 'unknown',
    discordCode: code,
    message: getDiscordErrorMessage(error),
    status,
  })
}

function toDiscordGuildMemberRoleMutationError(error: unknown) {
  const code = getDiscordErrorCode(error)
  const status = getDiscordErrorStatus(error)

  if (isDiscordGuildMemberNotFoundError(error)) {
    return new DiscordGuildMemberRoleMutationError({
      code: 'guild_member_not_found',
      discordCode: code,
      message: getDiscordErrorMessage(error),
      status,
    })
  }

  if (isDiscordRoleNotFoundError(error)) {
    return new DiscordGuildMemberRoleMutationError({
      code: 'role_not_found',
      discordCode: code,
      message: getDiscordErrorMessage(error),
      status,
    })
  }

  if (status === 403) {
    return new DiscordGuildMemberRoleMutationError({
      code: 'forbidden',
      discordCode: code,
      message: getDiscordErrorMessage(error),
      status,
    })
  }

  if (status === 429) {
    return new DiscordGuildMemberRoleMutationError({
      code: 'rate_limited',
      discordCode: code,
      message: getDiscordErrorMessage(error),
      status,
    })
  }

  return new DiscordGuildMemberRoleMutationError({
    code: 'unknown',
    discordCode: code,
    message: getDiscordErrorMessage(error),
    status,
  })
}

function toDiscordGuildMemberRecord(member: DiscordGuildMemberApiRecord, fallbackDiscordUserId?: string) {
  const discordUserId = typeof member.user?.id === 'string' ? member.user.id : fallbackDiscordUserId

  if (!discordUserId) {
    return null
  }

  return {
    discordUserId,
    roleIds: [...(member.roles ?? [])].sort((left, right) => left.localeCompare(right)),
  } satisfies DiscordGuildMemberRecord
}

export async function addDiscordGuildMemberRole(
  ctx: Pick<DiscordContext, 'env'>,
  options: DiscordGuildMemberRoleMutationOptions,
) {
  const rest = getDiscordGuildMemberRoleRestClient(ctx, options)

  try {
    await rest.put(Routes.guildMemberRole(options.guildId, options.userId, options.roleId), {
      reason: options.reason,
    })
  } catch (error) {
    throw toDiscordGuildMemberRoleMutationError(error)
  }
}

export async function getDiscordGuildMember(
  ctx: Pick<DiscordContext, 'env'>,
  options: GetDiscordGuildMemberOptions,
): Promise<DiscordGuildMemberRecord | null> {
  const rest = options.rest ?? getDiscordGuildMemberRoleRestClient(ctx, options)

  try {
    const result = (await rest.get(Routes.guildMember(options.guildId, options.userId))) as DiscordGuildMemberApiRecord

    return toDiscordGuildMemberRecord(result, options.userId)
  } catch (error) {
    if (isDiscordGuildMemberNotFoundError(error)) {
      return null
    }

    throw toDiscordGuildMemberLookupError(error)
  }
}

export async function listDiscordGuildMembers(
  ctx: Pick<DiscordContext, 'env'>,
  options: ListDiscordGuildMembersOptions,
): Promise<DiscordGuildMemberRecord[]> {
  const rest = options.rest ?? getDiscordGuildMemberRoleRestClient(ctx, options)
  const members: DiscordGuildMemberRecord[] = []
  let after: string | undefined

  while (true) {
    const result = await rest.get(buildGuildMembersRoute(options.guildId, after))
    const currentBatch = Array.isArray(result) ? (result as DiscordGuildMemberApiRecord[]) : []

    if (currentBatch.length === 0) {
      break
    }

    let lastDiscordUserId: string | null = null

    for (const member of currentBatch) {
      const normalizedMember = toDiscordGuildMemberRecord(member)

      if (!normalizedMember) {
        continue
      }

      lastDiscordUserId = normalizedMember.discordUserId
      members.push(normalizedMember)
    }

    if (currentBatch.length < DISCORD_GUILD_MEMBERS_PAGE_SIZE || !lastDiscordUserId) {
      break
    }

    after = lastDiscordUserId
  }

  return members.sort((left, right) => left.discordUserId.localeCompare(right.discordUserId))
}

export async function removeDiscordGuildMemberRole(
  ctx: Pick<DiscordContext, 'env'>,
  options: DiscordGuildMemberRoleMutationOptions,
) {
  const rest = getDiscordGuildMemberRoleRestClient(ctx, options)

  try {
    await rest.delete(Routes.guildMemberRole(options.guildId, options.userId, options.roleId))
  } catch (error) {
    throw toDiscordGuildMemberRoleMutationError(error)
  }
}
