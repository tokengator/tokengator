import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { ApplicationCommandOptionType, MessageFlags, type InteractionReplyOptions } from 'discord.js'

type WhoisModule = typeof import('../src/commands/whois')

let previousBetterAuthUrl = ''
let previousBetterAuthUrlWasSet = false
let whoisModule: WhoisModule

beforeAll(async () => {
  previousBetterAuthUrl = process.env.BETTER_AUTH_URL ?? ''
  previousBetterAuthUrlWasSet = 'BETTER_AUTH_URL' in process.env
  process.env.BETTER_AUTH_URL = 'http://127.0.0.1:3000'
  whoisModule = await import(`../src/commands/whois.ts?test=${Date.now()}-whois`)
})

afterAll(() => {
  if (previousBetterAuthUrlWasSet) {
    process.env.BETTER_AUTH_URL = previousBetterAuthUrl
  } else {
    delete process.env.BETTER_AUTH_URL
  }
})

function getEmbedJson(reply: InteractionReplyOptions) {
  const [embed] = reply.embeds ?? []

  if (!embed || !('toJSON' in embed)) {
    throw new Error('Expected an embed reply.')
  }

  return embed.toJSON()
}

function getFieldValue(reply: InteractionReplyOptions, name: string) {
  const embed = getEmbedJson(reply)
  const field = embed.fields?.find((candidate) => candidate.name === name)

  return field?.value ?? null
}

describe('/whois reply helpers', () => {
  test('known users get an ephemeral profile reply without an action button', () => {
    const reply = whoisModule.createKnownWhoisReply({
      discordUserId: '1234567890',
      identities: [
        {
          provider: 'discord',
          providerId: '1234567890',
        },
        {
          provider: 'solana',
          providerId: 'So11111111111111111111111111111111111111112',
        },
      ],
      solanaWallets: [
        {
          address: 'So11111111111111111111111111111111111111112',
          isPrimary: true,
          name: 'Treasury',
        },
        {
          address: 'Vote111111111111111111111111111111111111111',
          isPrimary: false,
          name: null,
        },
      ],
      user: {
        name: 'Alice Example',
        role: 'admin',
        username: 'alice',
      },
    })

    expect(reply.components ?? []).toHaveLength(0)
    expect(reply.flags).toBe(MessageFlags.Ephemeral)
    expect(getEmbedJson(reply).description).toContain('<@1234567890>')
    expect(getFieldValue(reply, 'Name')).toBe('Alice Example')
    expect(getFieldValue(reply, 'Role')).toBe('admin')
    expect(getFieldValue(reply, 'Username')).toBe('@alice')
    expect(getFieldValue(reply, 'Linked Identities')).toContain('Discord: <@1234567890>')
    expect(getFieldValue(reply, 'Linked Identities')).toContain(
      'Solana: [So1111…111112](https://orbmarkets.io/address/So11111111111111111111111111111111111111112)',
    )
    expect(getFieldValue(reply, 'Linked Solana Wallets')).toContain(
      'Primary: [Treasury](https://orbmarkets.io/address/So11111111111111111111111111111111111111112)',
    )
    expect(getFieldValue(reply, 'Linked Solana Wallets')).toContain(
      '([So11111111111111111111111111111111111111112](https://orbmarkets.io/address/So11111111111111111111111111111111111111112))',
    )
    expect(getFieldValue(reply, 'Linked Solana Wallets')).toContain(
      '[Vote11…111111](https://orbmarkets.io/address/Vote111111111111111111111111111111111111111)',
    )
  })

  test('unknown users get an ephemeral reply without an action button', () => {
    const reply = whoisModule.createUnknownWhoisReply({
      discordUserId: '1234567890',
    })

    expect(reply.components ?? []).toHaveLength(0)
    expect(reply.flags).toBe(MessageFlags.Ephemeral)
    expect(getEmbedJson(reply).description).toContain('No TokenGator account is linked to <@1234567890> yet.')
  })

  test('missing usernames render as Not set yet', () => {
    const reply = whoisModule.createKnownWhoisReply({
      discordUserId: '1234567890',
      identities: [],
      solanaWallets: [],
      user: {
        name: 'Bob Example',
        role: 'user',
        username: null,
      },
    })

    expect(getFieldValue(reply, 'Username')).toBe('Not set yet')
  })

  test('long identity and wallet lists are truncated to fit Discord embed field limits', () => {
    const reply = whoisModule.createKnownWhoisReply({
      discordUserId: '1234567890',
      identities: Array.from({ length: 80 }, (_, index) => ({
        provider: index % 2 === 0 ? 'discord' : 'solana',
        providerId: `identity-${index.toString().padStart(3, '0')}-12345678901234567890`,
      })),
      solanaWallets: Array.from({ length: 80 }, (_, index) => ({
        address: `wallet-${index.toString().padStart(3, '0')}-1234567890123456789012345678901234567890`,
        isPrimary: index === 0,
        name: `Wallet ${index.toString().padStart(3, '0')} ${'x'.repeat(16)}`,
      })),
      user: {
        name: 'Dana Example',
        role: 'user',
        username: 'dana',
      },
    })

    const identitiesValue = getFieldValue(reply, 'Linked Identities')
    const walletsValue = getFieldValue(reply, 'Linked Solana Wallets')

    expect(identitiesValue).not.toBeNull()
    expect(walletsValue).not.toBeNull()
    expect(identitiesValue!.length).toBeLessThanOrEqual(1024)
    expect(walletsValue!.length).toBeLessThanOrEqual(1024)
    expect(identitiesValue).toContain('more')
    expect(walletsValue).toContain('more')
  })

  test('command metadata includes a required user option', () => {
    const [userOption] = whoisModule.whoisCommand.data.options ?? []

    expect(userOption).toEqual({
      description: 'The tagged Discord user to look up.',
      name: 'user',
      required: true,
      type: ApplicationCommandOptionType.User,
    })
  })
})
