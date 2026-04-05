import { REST, Routes } from 'discord.js'
import { formatLogError, getAppLogger } from '@tokengator/logger'

import type { DiscordContext } from './discord-context'
import { discordChatInputCommands } from './commands'
import { getDiscordBotToken, getDiscordClientId, getDiscordGuildId } from './discord-env'

const logger = getAppLogger('discord', 'register-commands')

export interface RegisterDiscordCommandsOptions {
  clientId?: string
  guildId?: string
  token?: string
}

export async function registerDiscordCommands(
  ctx: Pick<DiscordContext, 'env'>,
  options: RegisterDiscordCommandsOptions = {},
) {
  const clientId = getDiscordClientId(ctx, options.clientId)
  const guildId = getDiscordGuildId(ctx, options.guildId)
  const token = getDiscordBotToken(ctx, options.token)
  const rest = new REST({ version: '10' }).setToken(token)

  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: discordChatInputCommands.map((command) => command.data),
    })

    logger.info('Registered {count} guild command(s) for guild {guildId}.', {
      count: discordChatInputCommands.length,
      guildId,
    })
  } catch (error) {
    logger.error('Failed to register guild commands: {error}', {
      error: formatLogError(error),
    })
    throw error
  }
}
