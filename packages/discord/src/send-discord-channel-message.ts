import { REST, Routes, type RESTPostAPIChannelMessageJSONBody } from 'discord.js'

import type { DiscordContext } from './discord-context'
import { getDiscordBotToken } from './discord-env'

export type DiscordChannelMessageErrorCode = 'channel_not_found' | 'forbidden' | 'rate_limited' | 'unknown'

export class DiscordChannelMessageError extends Error {
  readonly code: DiscordChannelMessageErrorCode
  readonly discordCode: number | null
  readonly status: number | null

  constructor(input: {
    code: DiscordChannelMessageErrorCode
    discordCode: number | null
    message: string
    status: number | null
  }) {
    super(input.message)
    this.code = input.code
    this.discordCode = input.discordCode
    this.name = 'DiscordChannelMessageError'
    this.status = input.status
  }
}

export interface SendDiscordChannelMessageOptions {
  body?: RESTPostAPIChannelMessageJSONBody
  channelId: string
  content?: string
  rest?: {
    post(route: string, options?: { body?: unknown }): Promise<unknown>
  }
  token?: string
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

function toDiscordChannelMessageError(error: unknown) {
  const code = getDiscordErrorCode(error)
  const status = getDiscordErrorStatus(error)

  if (code === 10_003 || status === 404) {
    return new DiscordChannelMessageError({
      code: 'channel_not_found',
      discordCode: code,
      message: getDiscordErrorMessage(error),
      status,
    })
  }

  if (status === 403) {
    return new DiscordChannelMessageError({
      code: 'forbidden',
      discordCode: code,
      message: getDiscordErrorMessage(error),
      status,
    })
  }

  if (status === 429) {
    return new DiscordChannelMessageError({
      code: 'rate_limited',
      discordCode: code,
      message: getDiscordErrorMessage(error),
      status,
    })
  }

  return new DiscordChannelMessageError({
    code: 'unknown',
    discordCode: code,
    message: getDiscordErrorMessage(error),
    status,
  })
}

export async function sendDiscordChannelMessage(
  ctx: Pick<DiscordContext, 'env'>,
  options: SendDiscordChannelMessageOptions,
) {
  const rest = options.rest ?? new REST({ version: '10' }).setToken(getDiscordBotToken(ctx, options.token))
  const body = options.body ?? {
    content: options.content ?? '',
  }

  try {
    await rest.post(Routes.channelMessages(options.channelId), {
      body,
    })
  } catch (error) {
    throw toDiscordChannelMessageError(error)
  }
}
