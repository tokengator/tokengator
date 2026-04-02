import { Client, Events, GatewayIntentBits } from 'discord.js'
import { once } from 'node:events'

import type { DiscordContext } from './discord-context'
import { discordChatInputCommandMap } from './commands'
import { getDiscordBotToken } from './discord-env'

export interface DiscordBotRuntime {
  stop(): Promise<void>
}

export interface StartDiscordBotOptions {
  token?: string
}

export async function startDiscordBot(
  ctx: DiscordContext,
  options: StartDiscordBotOptions = {},
): Promise<DiscordBotRuntime> {
  const token = getDiscordBotToken(ctx, options.token)
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  })

  client.once(Events.ClientReady, (readyClient) => {
    console.info(`[discord] Logged in as ${readyClient.user.tag} across ${readyClient.guilds.cache.size} guild(s).`)
  })

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return
    }

    const command = discordChatInputCommandMap.get(interaction.commandName)

    if (!command) {
      await interaction.reply({
        content: 'Unknown command.',
        ephemeral: true,
      })

      return
    }

    try {
      await command.execute(ctx, interaction)
    } catch (error) {
      console.error(`[discord] Failed to execute /${interaction.commandName}.`, error)

      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({
            content: 'Sorry, something went wrong while handling that command.',
            ephemeral: true,
          })

          return
        }

        await interaction.reply({
          content: 'Sorry, something went wrong while handling that command.',
          ephemeral: true,
        })
      } catch (replyError) {
        console.error(`[discord] Failed to report interaction error for /${interaction.commandName}.`, replyError)
      }
    }
  })

  const readyPromise = once(client, Events.ClientReady)

  await client.login(token)
  await readyPromise

  return {
    async stop() {
      client.destroy()
    },
  }
}
