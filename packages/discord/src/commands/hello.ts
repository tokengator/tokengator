import type { ChatInputCommandInteraction } from 'discord.js'

export const helloCommand = {
  data: {
    description: 'Say hello from TokenGator.',
    name: 'hello',
  },
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
      content: `Hello from TokenGator, <@${interaction.user.id}>.`,
      ephemeral: true,
    })
  },
}
