type DiscordFixture = {
  accountId: string
}

type SolanaFixture = {
  publicKey: string
  secret: readonly number[]
}

export type TestUser = {
  solana: SolanaFixture
  username: string
}

export type SeedUser = {
  discord: DiscordFixture
  email: string
  expectedRole: 'admin' | 'user'
  image: string
  name: string
  solana?: SolanaFixture
  username: string
}

export const alice = {
  solana: {
    publicKey: 'ALiC98dw6j47Skrxje3zBN4jTA11w67JRjQRBeZH3BRG',
    secret: [
      255, 215, 204, 225, 169, 184, 158, 202, 63, 124, 6, 32, 255, 73, 197, 125, 12, 70, 179, 193, 91, 206, 85, 228,
      147, 220, 204, 93, 65, 189, 3, 106, 138, 197, 203, 50, 45, 58, 90, 237, 111, 155, 255, 101, 3, 133, 100, 108, 254,
      35, 33, 104, 61, 195, 80, 87, 59, 0, 12, 214, 219, 248, 248, 119,
    ],
  },
  username: 'alice',
} as const satisfies TestUser

export const bob = {
  solana: {
    publicKey: 'BoBigKFEgt5izFVmpZAqnHDjNXNMYFbYrbiXy4EkfJDE',
    secret: [
      128, 142, 119, 244, 20, 49, 23, 145, 238, 13, 193, 26, 71, 165, 89, 226, 25, 171, 202, 165, 144, 39, 90, 17, 83,
      77, 7, 164, 224, 94, 142, 15, 160, 105, 180, 189, 217, 106, 163, 191, 141, 114, 251, 233, 166, 37, 119, 227, 38,
      189, 239, 9, 91, 210, 59, 165, 175, 167, 158, 98, 105, 74, 149, 169,
    ],
  },
  username: 'bob',
} as const satisfies TestUser

type SeedUserDefinition = SeedUser

const seedUserDefinitions: SeedUserDefinition[] = [
  {
    discord: {
      accountId: `discord-${alice.username}`,
    },
    email: 'alice@example.com',
    expectedRole: 'admin',
    image: `https://api.dicebear.com/9.x/bottts/png?seed=${alice.username}`,
    name: 'Alice',
    solana: alice.solana,
    username: alice.username,
  },
  {
    discord: {
      accountId: `discord-${bob.username}`,
    },
    email: 'bob@example.com',
    expectedRole: 'user',
    image: `https://api.dicebear.com/9.x/bottts/png?seed=${bob.username}`,
    name: 'Bob',
    solana: bob.solana,
    username: bob.username,
  },
  {
    discord: {
      accountId: 'discord-carol',
    },
    email: 'carol@example.com',
    expectedRole: 'user',
    image: 'https://api.dicebear.com/9.x/bottts/png?seed=carol',
    name: 'Carol',
    username: 'carol',
  },
]

seedUserDefinitions.sort((left, right) => left.email.localeCompare(right.email))

export function createDevSeedUsers(): SeedUser[] {
  return seedUserDefinitions.map((seedUser) => ({
    discord: seedUser.discord,
    email: seedUser.email,
    expectedRole: seedUser.expectedRole,
    image: seedUser.image,
    name: seedUser.name,
    ...(seedUser.solana ? { solana: seedUser.solana } : {}),
    username: seedUser.username,
  }))
}

export const devSeedUsers = createDevSeedUsers()
