import type { ChatInputCommandInteraction } from 'discord.js'

import { helloCommand } from './hello'
import { whoamiCommand } from './whoami'

export interface DiscordChatInputCommand {
  data: {
    description: string
    name: string
  }
  execute(interaction: ChatInputCommandInteraction): Promise<void>
}

export const discordChatInputCommands: DiscordChatInputCommand[] = [helloCommand, whoamiCommand].sort((a, b) =>
  a.data.name.localeCompare(b.data.name),
)

export const discordChatInputCommandMap = new Map(
  discordChatInputCommands.map((command) => [command.data.name, command] as const),
)
