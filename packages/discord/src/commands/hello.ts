import type { ChatInputCommandInteraction } from 'discord.js'

import type { DiscordContext } from '../discord-context'

export const helloCommand = {
  data: {
    description: 'Say hello from TokenGator.',
    name: 'hello',
  },
  async execute(_ctx: DiscordContext, interaction: ChatInputCommandInteraction) {
    await interaction.reply({
      content: `Hello from TokenGator, <@${interaction.user.id}>.`,
      ephemeral: true,
    })
  },
}
