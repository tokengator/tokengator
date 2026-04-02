import type { ChatInputApplicationCommandData, ChatInputCommandInteraction } from 'discord.js'

import type { DiscordContext } from '../discord-context'
import { helloCommand } from './hello'
import { whoamiCommand } from './whoami'
import { whoisCommand } from './whois'

export interface DiscordChatInputCommand {
  data: ChatInputApplicationCommandData
  execute(ctx: DiscordContext, interaction: ChatInputCommandInteraction): Promise<void>
}

export const discordChatInputCommands: DiscordChatInputCommand[] = [helloCommand, whoamiCommand, whoisCommand].sort(
  (a, b) => a.data.name.localeCompare(b.data.name),
)

export const discordChatInputCommandMap = new Map(
  discordChatInputCommands.map((command) => [command.data.name, command] as const),
)
