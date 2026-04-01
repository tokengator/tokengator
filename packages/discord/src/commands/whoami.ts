import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
  type InteractionReplyOptions,
} from 'discord.js'

import { getDiscordPlatformUrl } from '../discord-env'

type WhoamiIdentity = {
  accountId: string
  providerId: string
}

type WhoamiSolanaWallet = {
  address: string
  isPrimary: boolean
  name: string | null
}

type WhoamiUser = {
  name: string
  role: string
  username: string | null
}

type WhoamiProfile = {
  identities: WhoamiIdentity[]
  solanaWallets: WhoamiSolanaWallet[]
  user: WhoamiUser
}

const DISCORD_EMBED_FIELD_VALUE_MAX_LENGTH = 1024
const ORB_MARKETS_ADDRESS_URL_PREFIX = 'https://orbmarkets.io/address/'

export function ellipsifySolanaWalletAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-6)}`
}

function createLinkActionRow(args: { label: string; url: string }) {
  const { label, url } = args

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel(label).setStyle(ButtonStyle.Link).setURL(url),
  )
}

function formatDiscordEmbedList(args: { emptyValue: string; items: string[] }) {
  const { emptyValue, items } = args

  if (items.length === 0) {
    return emptyValue
  }

  const lines: string[] = []
  let currentLength = 0

  for (const item of items) {
    const itemLength = item.length + (lines.length > 0 ? 1 : 0)

    if (currentLength + itemLength <= DISCORD_EMBED_FIELD_VALUE_MAX_LENGTH) {
      lines.push(item)
      currentLength += itemLength
      continue
    }

    let overflowLine = `- …and ${items.length - lines.length} more`

    while (lines.length > 0 && currentLength + 1 + overflowLine.length > DISCORD_EMBED_FIELD_VALUE_MAX_LENGTH) {
      const popped = lines.pop()

      if (!popped) {
        break
      }

      currentLength -= popped.length

      if (lines.length > 0) {
        currentLength -= 1
      }

      overflowLine = `- …and ${items.length - lines.length} more`
    }

    return lines.length > 0 ? [...lines, overflowLine].join('\n') : overflowLine
  }

  return lines.join('\n')
}

function formatIdentityList(identities: WhoamiIdentity[]) {
  return formatDiscordEmbedList({
    emptyValue: 'No linked identities.',
    items: identities.map(formatIdentity),
  })
}

function formatIdentity(identity: WhoamiIdentity) {
  switch (identity.providerId) {
    case 'discord':
      return `- Discord: <@${identity.accountId}>`
    case 'siws':
      return `- Solana: ${formatMarkdownLink({
        label: identity.accountId,
        url: getOrbMarketsAddressUrl(identity.accountId),
      })}`
    default:
      return `- ${formatProviderLabel(identity.providerId)}: \`${identity.accountId}\``
  }
}

function formatMarkdownLink(args: { label: string; url: string }) {
  const { label, url } = args

  return `[${label}](${url})`
}

function formatProviderLabel(providerId: string) {
  switch (providerId) {
    case 'discord':
      return 'Discord'
    case 'siws':
      return 'Solana'
    default:
      return providerId
  }
}

function formatSolanaWalletDisplayName(wallet: WhoamiSolanaWallet) {
  const trimmedName = wallet.name?.trim()

  return trimmedName ? trimmedName : ellipsifySolanaWalletAddress(wallet.address)
}

function formatSolanaWallet(wallet: WhoamiSolanaWallet) {
  const prefix = wallet.isPrimary ? 'Primary: ' : ''
  const url = getOrbMarketsAddressUrl(wallet.address)

  if (wallet.name?.trim()) {
    return `- ${prefix}${formatMarkdownLink({
      label: formatSolanaWalletDisplayName(wallet),
      url,
    })} (${formatMarkdownLink({
      label: wallet.address,
      url,
    })})`
  }

  return `- ${prefix}${formatMarkdownLink({
    label: formatSolanaWalletDisplayName(wallet),
    url,
  })}`
}

function formatSolanaWalletList(solanaWallets: WhoamiSolanaWallet[]) {
  return formatDiscordEmbedList({
    emptyValue: 'No linked Solana wallets yet.',
    items: solanaWallets.map(formatSolanaWallet),
  })
}

function getOrbMarketsAddressUrl(address: string) {
  return `${ORB_MARKETS_ADDRESS_URL_PREFIX}${address}`
}

export function createKnownWhoamiReply(args: { manageProfileUrl: string } & WhoamiProfile): InteractionReplyOptions {
  const { identities, manageProfileUrl, solanaWallets, user } = args
  const embed = new EmbedBuilder()
    .setColor(0x60d0aa)
    .setDescription('This TokenGator account is linked to your Discord user.')
    .setTitle('Your TokenGator Account')
    .addFields(
      {
        inline: true,
        name: 'Name',
        value: user.name,
      },
      {
        inline: true,
        name: 'Username',
        value: user.username ? `@${user.username}` : 'Not set yet',
      },
      {
        inline: true,
        name: 'Role',
        value: user.role,
      },
      {
        name: 'Linked Identities',
        value: formatIdentityList(identities),
      },
      {
        name: 'Linked Solana Wallets',
        value: formatSolanaWalletList(solanaWallets),
      },
    )

  return {
    components: [createLinkActionRow({ label: 'Manage Profile', url: manageProfileUrl })],
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  }
}

export function createUnknownWhoamiReply(args: { registerUrl: string }): InteractionReplyOptions {
  const embed = new EmbedBuilder()
    .setColor(0xf0b429)
    .setDescription('No TokenGator account is linked to this Discord user yet.')
    .setTitle('Register with TokenGator')

  return {
    components: [createLinkActionRow({ label: 'Register', url: args.registerUrl })],
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  }
}

async function getWhoamiProfile(discordUserId: string): Promise<WhoamiProfile | null> {
  const { db } = await import('@tokengator/db')
  const discordAccount = await db.query.account.findFirst({
    columns: {
      userId: true,
    },
    orderBy: (account, { asc }) => [asc(account.createdAt), asc(account.id)],
    where: (account, { and, eq }) => and(eq(account.accountId, discordUserId), eq(account.providerId, 'discord')),
    with: {
      user: {
        columns: {
          name: true,
          role: true,
          username: true,
        },
      },
    },
  })

  if (!discordAccount?.user) {
    return null
  }

  const [identities, solanaWallets] = await Promise.all([
    db.query.account.findMany({
      columns: {
        accountId: true,
        providerId: true,
      },
      orderBy: (account, { asc }) => [asc(account.providerId), asc(account.accountId)],
      where: (account, { and, eq, ne }) =>
        and(eq(account.userId, discordAccount.userId), ne(account.providerId, 'credential')),
    }),
    db.query.solanaWallet.findMany({
      columns: {
        address: true,
        isPrimary: true,
        name: true,
      },
      orderBy: (solanaWallet, { asc }) => [asc(solanaWallet.address)],
      where: (solanaWallet, { eq }) => eq(solanaWallet.userId, discordAccount.userId),
    }),
  ])

  return {
    identities,
    solanaWallets,
    user: {
      name: discordAccount.user.name,
      role: discordAccount.user.role,
      username: discordAccount.user.username,
    },
  }
}

function getWhoamiUrls() {
  const baseUrl = getDiscordPlatformUrl()

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
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    })

    const profilePromise = getWhoamiProfile(interaction.user.id)
    const urls = getWhoamiUrls()
    const profile = await profilePromise
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
