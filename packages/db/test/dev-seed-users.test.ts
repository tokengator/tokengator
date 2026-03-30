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

    expect(devSeedUsers.map((user) => user.email)).toEqual([
      'alice@example.com',
      'bob@example.com',
      'carol@example.com',
    ])
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
