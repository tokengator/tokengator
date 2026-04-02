import { MessageFlags, type ChatInputCommandInteraction, type InteractionReplyOptions } from 'discord.js'

import type { DiscordContext } from '../discord-context'
import { getDiscordPlatformUrl } from '../discord-env'
import {
  createKnownProfileReply,
  createUnknownProfileReply,
  getDiscordUserProfile,
  type DiscordUserProfile,
} from './profile-reply'

export function createKnownWhoamiReply(
  args: { manageProfileUrl: string } & DiscordUserProfile,
): InteractionReplyOptions {
  const { manageProfileUrl, ...profile } = args

  return createKnownProfileReply({
    action: {
      label: 'Manage Profile',
      url: manageProfileUrl,
    },
    description: 'This TokenGator account is linked to your Discord user.',
    ...profile,
    title: 'Your TokenGator Account',
  })
}

export function createUnknownWhoamiReply(args: { registerUrl: string }): InteractionReplyOptions {
  return createUnknownProfileReply({
    action: {
      label: 'Register',
      url: args.registerUrl,
    },
    description: 'No TokenGator account is linked to this Discord user yet.',
    title: 'Register with TokenGator',
  })
}

function getWhoamiUrls(ctx: Pick<DiscordContext, 'env'>) {
  const baseUrl = getDiscordPlatformUrl(ctx)

  return {
    manageProfileUrl: new URL('/profile', baseUrl).toString(),
    registerUrl: new URL('/login', baseUrl).toString(),
  }
}

export const whoamiCommand = {
  data: {
    description: 'Show your TokenGator account details.',
    name: 'whoami',
  },
  async execute(ctx: DiscordContext, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    })

    const urls = getWhoamiUrls(ctx)
    const profile = await getDiscordUserProfile(ctx, interaction.user.id)
    const reply = profile
      ? createKnownWhoamiReply({
          identities: profile.identities,
          manageProfileUrl: urls.manageProfileUrl,
          solanaWallets: profile.solanaWallets,
          user: profile.user,
        })
      : createUnknownWhoamiReply({
          registerUrl: urls.registerUrl,
        })

    await interaction.editReply({
      components: reply.components,
      embeds: reply.embeds,
    })
  },
}
