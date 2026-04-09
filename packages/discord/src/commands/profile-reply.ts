import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  type InteractionReplyOptions,
} from 'discord.js'

import type { DiscordContext } from '../discord-context'

export type DiscordProfileIdentity = {
  avatarUrl?: string | null
  displayName?: string | null
  email?: string | null
  isPrimary?: boolean
  linkedAt?: Date | number
  provider: string
  providerId: string
  username?: string | null
}

export type DiscordProfileSolanaWallet = {
  address: string
  isPrimary: boolean
  name: string | null
}

export type DiscordProfileUser = {
  name: string
  role: string
  username: string | null
}

export type DiscordUserProfile = {
  identities: DiscordProfileIdentity[]
  solanaWallets: DiscordProfileSolanaWallet[]
  user: DiscordProfileUser
}

type ProfileReplyAction = {
  label: string
  url: string
}

type ProfileReplyCopy = {
  description: string
  title: string
}

const DISCORD_EMBED_FIELD_VALUE_MAX_LENGTH = 1024
const ORB_MARKETS_ADDRESS_URL_PREFIX = 'https://orbmarkets.io/address/'

function createLinkActionRow(args: ProfileReplyAction) {
  const { label, url } = args

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel(label).setStyle(ButtonStyle.Link).setURL(url),
  )
}

function createProfileReply(args: { action?: ProfileReplyAction; embed: EmbedBuilder }): InteractionReplyOptions {
  const { action, embed } = args

  return {
    components: action ? [createLinkActionRow(action)] : [],
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  }
}

export function createKnownProfileReply(
  args: { action?: ProfileReplyAction } & ProfileReplyCopy & DiscordUserProfile,
): InteractionReplyOptions {
  const { action, description, identities, solanaWallets, title, user } = args
  const embed = new EmbedBuilder()
    .setColor(0x60d0aa)
    .setDescription(description)
    .setTitle(title)
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

  return createProfileReply({ action, embed })
}

export function createUnknownProfileReply(
  args: { action?: ProfileReplyAction } & ProfileReplyCopy,
): InteractionReplyOptions {
  const { action, description, title } = args
  const embed = new EmbedBuilder().setColor(0xf0b429).setDescription(description).setTitle(title)

  return createProfileReply({ action, embed })
}

export function ellipsifySolanaWalletAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-6)}`
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

function formatIdentity(identity: DiscordProfileIdentity) {
  const label = formatProviderLabel(identity.provider)

  switch (identity.provider) {
    case 'discord':
      return `- ${label}: <@${identity.providerId}>`
    case 'solana':
      return `- ${label}: ${formatMarkdownLink({
        label: ellipsifySolanaWalletAddress(identity.providerId),
        url: getOrbMarketsAddressUrl(identity.providerId),
      })}`
    default:
      return `- ${label}: \`${identity.providerId}\``
  }
}

function formatIdentityList(identities: DiscordProfileIdentity[]) {
  return formatDiscordEmbedList({
    emptyValue: 'No linked identities.',
    items: identities.map(formatIdentity),
  })
}

function formatMarkdownLink(args: { label: string; url: string }) {
  const { label, url } = args

  return `[${label}](${url})`
}

function formatProviderLabel(provider: string) {
  switch (provider) {
    case 'discord':
      return 'Discord'
    case 'solana':
      return 'Solana'
    default:
      return provider
  }
}

function formatSolanaWallet(wallet: DiscordProfileSolanaWallet) {
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

function formatSolanaWalletDisplayName(wallet: DiscordProfileSolanaWallet) {
  const trimmedName = wallet.name?.trim()

  return trimmedName ? trimmedName : ellipsifySolanaWalletAddress(wallet.address)
}

function formatSolanaWalletList(solanaWallets: DiscordProfileSolanaWallet[]) {
  return formatDiscordEmbedList({
    emptyValue: 'No linked Solana wallets yet.',
    items: solanaWallets.map(formatSolanaWallet),
  })
}

function getOrbMarketsAddressUrl(address: string) {
  return `${ORB_MARKETS_ADDRESS_URL_PREFIX}${address}`
}

export async function getDiscordUserProfile(
  context: Pick<DiscordContext, 'db'>,
  discordUserId: string,
): Promise<DiscordUserProfile | null> {
  const discordIdentity = await context.db.query.identity.findFirst({
    columns: {
      userId: true,
    },
    orderBy: (identity, { asc, desc }) => [desc(identity.isPrimary), asc(identity.linkedAt), asc(identity.id)],
    where: (identity, { and, eq }) => and(eq(identity.provider, 'discord'), eq(identity.providerId, discordUserId)),
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
  const discordAccount = !discordIdentity?.user
    ? await context.db.query.account.findFirst({
        columns: {
          userId: true,
        },
        orderBy: (account, { asc }) => [asc(account.createdAt), asc(account.id)],
        where: (account, { and, eq }) => and(eq(account.providerId, 'discord'), eq(account.accountId, discordUserId)),
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
    : null
  const linkedDiscordUser = discordIdentity?.user
    ? {
        user: discordIdentity.user,
        userId: discordIdentity.userId,
      }
    : discordAccount?.user
      ? {
          user: discordAccount.user,
          userId: discordAccount.userId,
        }
      : null

  if (!linkedDiscordUser?.user) {
    return null
  }

  const [identityRows, solanaWallets] = await Promise.all([
    context.db.query.identity.findMany({
      columns: {
        avatarUrl: true,
        displayName: true,
        email: true,
        isPrimary: true,
        linkedAt: true,
        provider: true,
        providerId: true,
        username: true,
      },
      orderBy: (identity, { asc, desc }) => [
        asc(identity.provider),
        desc(identity.isPrimary),
        asc(identity.linkedAt),
        asc(identity.providerId),
      ],
      where: (identity, { and, eq, ne }) =>
        and(eq(identity.userId, linkedDiscordUser.userId), ne(identity.provider, 'solana')),
    }),
    context.db.query.solanaWallet.findMany({
      columns: {
        address: true,
        isPrimary: true,
        name: true,
      },
      orderBy: (solanaWallet, { asc }) => [asc(solanaWallet.address)],
      where: (solanaWallet, { eq }) => eq(solanaWallet.userId, linkedDiscordUser.userId),
    }),
  ])
  const identities =
    identityRows.length > 0
      ? identityRows
      : (
          await context.db.query.account.findMany({
            columns: {
              accountId: true,
              providerId: true,
            },
            orderBy: (account, { asc }) => [asc(account.providerId), asc(account.createdAt), asc(account.id)],
            where: (account, { and, eq, ne }) =>
              and(eq(account.userId, linkedDiscordUser.userId), ne(account.providerId, 'credential')),
          })
        ).map((account) => ({
          provider: account.providerId,
          providerId: account.accountId,
        }))

  return {
    identities,
    solanaWallets,
    user: {
      name: linkedDiscordUser.user.name,
      role: linkedDiscordUser.user.role,
      username: linkedDiscordUser.user.username,
    },
  }
}
