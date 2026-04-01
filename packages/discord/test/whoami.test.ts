import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { MessageFlags, type InteractionReplyOptions } from 'discord.js'

type WhoamiModule = typeof import('../src/commands/whoami')

let previousBetterAuthUrl = ''
let previousBetterAuthUrlWasSet = false
let whoamiModule: WhoamiModule

beforeAll(async () => {
  previousBetterAuthUrl = process.env.BETTER_AUTH_URL ?? ''
  previousBetterAuthUrlWasSet = 'BETTER_AUTH_URL' in process.env
  process.env.BETTER_AUTH_URL = 'http://127.0.0.1:3000'
  whoamiModule = await import(`../src/commands/whoami.ts?test=${Date.now()}-whoami`)
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

function getFirstButtonJson(reply: InteractionReplyOptions) {
  const [component] = reply.components ?? []

  if (!component || !('toJSON' in component)) {
    throw new Error('Expected a component row.')
  }

  const row = component.toJSON()

  if (!('components' in row)) {
    throw new Error('Expected an action row component.')
  }

  const [button] = row.components ?? []

  if (!button) {
    throw new Error('Expected a button component.')
  }

  if (!('label' in button) || !('url' in button)) {
    throw new Error('Expected a link button component.')
  }

  return button
}

describe('/whoami reply helpers', () => {
  test('known users get an ephemeral profile reply with a manage profile link', () => {
    const reply = whoamiModule.createKnownWhoamiReply({
      identities: [
        {
          accountId: '1234567890',
          providerId: 'discord',
        },
        {
          accountId: 'So11111111111111111111111111111111111111112',
          providerId: 'siws',
        },
      ],
      manageProfileUrl: 'https://app.example.com/profile',
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

    expect(reply.flags).toBe(MessageFlags.Ephemeral)
    expect(getFieldValue(reply, 'Name')).toBe('Alice Example')
    expect(getFieldValue(reply, 'Role')).toBe('admin')
    expect(getFieldValue(reply, 'Username')).toBe('@alice')
    expect(getFieldValue(reply, 'Linked Identities')).toContain('Discord: <@1234567890>')
    expect(getFieldValue(reply, 'Linked Identities')).toContain(
      'Solana: [So11111111111111111111111111111111111111112](https://orbmarkets.io/address/So11111111111111111111111111111111111111112)',
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
    expect(getFirstButtonJson(reply).label).toBe('Manage Profile')
    expect(getFirstButtonJson(reply).url).toBe('https://app.example.com/profile')
  })

  test('unknown users get an ephemeral register reply with a login link', () => {
    const reply = whoamiModule.createUnknownWhoamiReply({
      registerUrl: 'https://app.example.com/login',
    })

    expect(reply.flags).toBe(MessageFlags.Ephemeral)
    expect(getEmbedJson(reply).description).toContain('No TokenGator account is linked')
    expect(getFirstButtonJson(reply).label).toBe('Register')
    expect(getFirstButtonJson(reply).url).toBe('https://app.example.com/login')
  })

  test('missing usernames render as Not set yet', () => {
    const reply = whoamiModule.createKnownWhoamiReply({
      identities: [],
      manageProfileUrl: 'https://app.example.com/profile',
      solanaWallets: [],
      user: {
        name: 'Bob Example',
        role: 'user',
        username: null,
      },
    })

    expect(getFieldValue(reply, 'Username')).toBe('Not set yet')
  })

  test('empty wallet lists render the expected fallback', () => {
    const reply = whoamiModule.createKnownWhoamiReply({
      identities: [],
      manageProfileUrl: 'https://app.example.com/profile',
      solanaWallets: [],
      user: {
        name: 'Carol Example',
        role: 'user',
        username: 'carol',
      },
    })

    expect(getFieldValue(reply, 'Linked Solana Wallets')).toBe('No linked Solana wallets yet.')
  })

  test('long identity and wallet lists are truncated to fit Discord embed field limits', () => {
    const reply = whoamiModule.createKnownWhoamiReply({
      identities: Array.from({ length: 80 }, (_, index) => ({
        accountId: `identity-${index.toString().padStart(3, '0')}-12345678901234567890`,
        providerId: index % 2 === 0 ? 'discord' : 'siws',
      })),
      manageProfileUrl: 'https://app.example.com/profile',
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

  test('truncation keeps the hidden-item count accurate after removing displayed lines', () => {
    const reply = whoamiModule.createKnownWhoamiReply({
      identities: Array.from({ length: 4 }, (_, index) => ({
        accountId: `${index.toString()}-${'x'.repeat(500)}`,
        providerId: 'test',
      })),
      manageProfileUrl: 'https://app.example.com/profile',
      solanaWallets: [],
      user: {
        name: 'Eve Example',
        role: 'user',
        username: 'eve',
      },
    })

    const identitiesValue = getFieldValue(reply, 'Linked Identities')

    expect(identitiesValue).not.toBeNull()
    expect(identitiesValue).toContain('- …and 3 more')
    expect(identitiesValue).not.toContain('- …and 2 more')
  })
})
