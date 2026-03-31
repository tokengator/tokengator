import { describe, expect, test } from 'bun:test'

import { parseStringList } from '../src/lib/server-env-list'

const API_ENV_KEYS = [
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_SOLANA_SIGN_IN_ENABLED',
  'BETTER_AUTH_URL',
  'CORS_ORIGINS',
  'DATABASE_AUTH_TOKEN',
  'DATABASE_URL',
  'DISCORD_ADMIN_IDS',
  'DISCORD_BOT_START',
  'DISCORD_BOT_TOKEN',
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'DISCORD_GUILD_ID',
  'HELIUS_API_KEY',
  'HELIUS_CLUSTER',
  'INDEXER_DEBUG',
  'NODE_ENV',
  'SOLANA_ADMIN_ADDRESSES',
  'SOLANA_CLUSTER',
  'SOLANA_ENDPOINT_PUBLIC',
  'WEB_URL',
] as const

function withApiEnv(overrides: Partial<Record<(typeof API_ENV_KEYS)[number], string | undefined>> = {}) {
  const previousEnv = new Map<string, string | undefined>()

  for (const key of API_ENV_KEYS) {
    previousEnv.set(key, process.env[key])
  }

  Object.assign(process.env, {
    BETTER_AUTH_SECRET: '12345678901234567890123456789012',
    BETTER_AUTH_SOLANA_SIGN_IN_ENABLED: 'true',
    BETTER_AUTH_URL: 'http://127.0.0.1:3000',
    CORS_ORIGINS: 'http://127.0.0.1:3001',
    DATABASE_AUTH_TOKEN: 'test-token',
    DATABASE_URL: 'file:///tmp/tokengator-env-test.sqlite',
    DISCORD_ADMIN_IDS: '',
    DISCORD_BOT_TOKEN: 'discord-bot-token',
    DISCORD_CLIENT_ID: 'discord-client-id',
    DISCORD_CLIENT_SECRET: 'discord-client-secret',
    HELIUS_API_KEY: 'helius-api-key',
    HELIUS_CLUSTER: 'devnet',
    NODE_ENV: 'test',
    SOLANA_ADMIN_ADDRESSES: '',
    SOLANA_CLUSTER: 'devnet',
    SOLANA_ENDPOINT_PUBLIC: 'https://api.devnet.solana.com',
  })

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key]
      continue
    }

    process.env[key] = value
  }

  return () => {
    for (const key of API_ENV_KEYS) {
      const previousValue = previousEnv.get(key)

      if (previousValue === undefined) {
        delete process.env[key]
        continue
      }

      process.env[key] = previousValue
    }
  }
}

describe('parseStringList', () => {
  test('returns an empty list when SOLANA_ADMIN_ADDRESSES is unset', () => {
    expect(parseStringList()).toEqual([])
  })

  test('trims, dedupes, sorts, and preserves case for SOLANA_ADMIN_ADDRESSES', () => {
    expect(
      parseStringList(
        '  vote111111111111111111111111111111111111111, So11111111111111111111111111111111111111112, vote111111111111111111111111111111111111111  ',
      ),
    ).toEqual(['So11111111111111111111111111111111111111112', 'vote111111111111111111111111111111111111111'])
  })
})

describe('env', () => {
  test('defaults DISCORD_BOT_START to true when unset', async () => {
    const restoreEnv = withApiEnv({
      DISCORD_BOT_START: undefined,
    })

    try {
      const { env } = await import(`../src/api.ts?test=${Date.now()}-default`)

      expect(env.DISCORD_BOT_START).toBe(true)
    } finally {
      restoreEnv()
    }
  })

  test('allows DISCORD_BOT_TOKEN to be unset when DISCORD_BOT_START=false', async () => {
    const restoreEnv = withApiEnv({
      DISCORD_BOT_START: 'false',
      DISCORD_BOT_TOKEN: undefined,
    })

    try {
      const { env } = await import(`../src/api.ts?test=${Date.now()}-optional-token`)

      expect(env.DISCORD_BOT_START).toBe(false)
      expect(env.DISCORD_BOT_TOKEN).toBeUndefined()
    } finally {
      restoreEnv()
    }
  })

  test('parses DISCORD_BOT_START=false', async () => {
    const restoreEnv = withApiEnv({
      DISCORD_BOT_START: 'false',
    })

    try {
      const { env } = await import(`../src/api.ts?test=${Date.now()}-false`)

      expect(env.DISCORD_BOT_START).toBe(false)
    } finally {
      restoreEnv()
    }
  })
})
