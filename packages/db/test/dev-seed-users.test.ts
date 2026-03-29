import { describe, expect, test } from 'bun:test'

import { alice, bob, createDevSeedUsers, DEFAULT_DEV_SEED_PASSWORD, devSeedUsers } from '../src/dev-seed-users'

describe('devSeedUsers', () => {
  test('exports canonical Alice and Bob fixtures with aligned passwords', () => {
    expect(alice).toMatchObject({
      password: DEFAULT_DEV_SEED_PASSWORD,
      solana: {
        publicKey: 'ALiC98dw6j47Skrxje3zBN4jTA11w67JRjQRBeZH3BRG',
      },
      username: 'alice',
    })
    expect(bob).toMatchObject({
      password: DEFAULT_DEV_SEED_PASSWORD,
      solana: {
        publicKey: 'BoBigKFEgt5izFVmpZAqnHDjNXNMYFbYrbiXy4EkfJDE',
      },
      username: 'bob',
    })
  })

  test('creates sorted seed users and supports password overrides', () => {
    const customUsers = createDevSeedUsers('custom-password')

    expect(devSeedUsers.map((user) => user.email)).toEqual([
      'alice@example.com',
      'bob@example.com',
      'carol@example.com',
    ])
    expect(customUsers.map((user) => user.password)).toEqual(['custom-password', 'custom-password', 'custom-password'])
    expect(customUsers.find((user) => user.username === alice.username)).toMatchObject({
      email: 'alice@example.com',
      solana: alice.solana,
      username: alice.username,
    })
    expect(customUsers.find((user) => user.username === bob.username)).toMatchObject({
      email: 'bob@example.com',
      solana: bob.solana,
      username: bob.username,
    })
  })
})
