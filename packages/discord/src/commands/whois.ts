import {
  ApplicationCommandOptionType,
  MessageFlags,
  type ChatInputCommandInteraction,
  type InteractionReplyOptions,
} from 'discord.js'

import type { DiscordContext } from '../discord-context'
import {
  createKnownProfileReply,
  createUnknownProfileReply,
  getDiscordUserProfile,
  type DiscordUserProfile,
} from './profile-reply'

function formatDiscordUserMention(discordUserId: string) {
  return `<@${discordUserId}>`
}

export function createKnownWhoisReply(args: { discordUserId: string } & DiscordUserProfile): InteractionReplyOptions {
  const { discordUserId, ...profile } = args

  return createKnownProfileReply({
    description: `This TokenGator account is linked to ${formatDiscordUserMention(discordUserId)}.`,
    ...profile,
    title: 'TokenGator Account Lookup',
  })
}

export function createUnknownWhoisReply(args: { discordUserId: string }): InteractionReplyOptions {
  return createUnknownProfileReply({
    description: `No TokenGator account is linked to ${formatDiscordUserMention(args.discordUserId)} yet.`,
    title: 'TokenGator Account Lookup',
  })
}

export const whoisCommand = {
  data: {
    description: "Show a tagged user's TokenGator account details.",
    name: 'whois',
    options: [
      {
        description: 'The tagged Discord user to look up.',
        name: 'user',
        required: true,
        type: ApplicationCommandOptionType.User,
      },
    ],
  },
  async execute(ctx: DiscordContext, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    })

    const user = interaction.options.getUser('user', true)
    const profile = await getDiscordUserProfile(ctx, user.id)
    const reply = profile
      ? createKnownWhoisReply({
          discordUserId: user.id,
          identities: profile.identities,
          solanaWallets: profile.solanaWallets,
          user: profile.user,
        })
      : createUnknownWhoisReply({
          discordUserId: user.id,
        })

    await interaction.editReply({
      components: reply.components,
      embeds: reply.embeds,
    })
  },
}
