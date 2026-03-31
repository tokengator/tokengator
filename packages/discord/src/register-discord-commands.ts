import { REST, Routes } from 'discord.js'

import { discordChatInputCommands } from './commands'
import { getDiscordBotToken, getDiscordClientId, getDiscordGuildId } from './discord-env'

export interface RegisterDiscordCommandsOptions {
  clientId?: string
  guildId?: string
  token?: string
}

export async function registerDiscordCommands(options: RegisterDiscordCommandsOptions = {}) {
  const clientId = getDiscordClientId(options.clientId)
  const guildId = getDiscordGuildId(options.guildId)
  const token = getDiscordBotToken(options.token)
  const rest = new REST({ version: '10' }).setToken(token)

  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: discordChatInputCommands.map((command) => command.data),
    })

    console.info(`[discord] Registered ${discordChatInputCommands.length} guild command(s) for guild ${guildId}.`)
  } catch (error) {
    console.error('[discord] Failed to register guild commands.', error)
    throw error
  }
}
