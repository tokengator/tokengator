import { describe, expect, test } from 'bun:test'

import { alice, bob, createDevSeedUsers, devSeedUsers } from '../src/dev-seed-users'

describe('devSeedUsers', () => {
  test('exports canonical Alice and Bob Solana fixtures', () => {
    expect(alice).toMatchObject({
      solana: {
        publicKey: 'ALiC98dw6j47Skrxje3zBN4jTA11w67JRjQRBeZH3BRG',
      },
      username: 'alice',
    })
    expect(bob).toMatchObject({
      solana: {
        publicKey: 'BoBigKFEgt5izFVmpZAqnHDjNXNMYFbYrbiXy4EkfJDE',
      },
      username: 'bob',
    })
  })

  test('creates sorted seed users', () => {
    const customUsers = createDevSeedUsers()

    expect(
      devSeedUsers.map((user) => ({
        discordAccountId: user.discord.accountId,
        email: user.email,
        image: user.image,
      })),
    ).toEqual([
      {
        discordAccountId: 'discord-alice',
        email: 'alice@example.com',
        image: 'https://api.dicebear.com/9.x/bottts/png?seed=alice',
      },
      {
        discordAccountId: 'discord-bob',
        email: 'bob@example.com',
        image: 'https://api.dicebear.com/9.x/bottts/png?seed=bob',
      },
      {
        discordAccountId: 'discord-carol',
        email: 'carol@example.com',
        image: 'https://api.dicebear.com/9.x/bottts/png?seed=carol',
      },
    ])
    expect(customUsers.find((user) => user.username === alice.username)).toMatchObject({
      discord: {
        accountId: 'discord-alice',
      },
      email: 'alice@example.com',
      image: 'https://api.dicebear.com/9.x/bottts/png?seed=alice',
      solana: alice.solana,
      username: alice.username,
    })
    expect(customUsers.find((user) => user.username === bob.username)).toMatchObject({
      discord: {
        accountId: 'discord-bob',
      },
      email: 'bob@example.com',
      image: 'https://api.dicebear.com/9.x/bottts/png?seed=bob',
      solana: bob.solana,
      username: bob.username,
    })
    expect(customUsers.find((user) => user.username === 'carol')).toMatchObject({
      discord: {
        accountId: 'discord-carol',
      },
      email: 'carol@example.com',
      image: 'https://api.dicebear.com/9.x/bottts/png?seed=carol',
      username: 'carol',
    })
  })
})
