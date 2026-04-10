import { describe, expect, test } from 'bun:test'

const DISCORD_ENV_KEYS = [
  'API_URL',
  'DISCORD_BOT_START',
  'DISCORD_BOT_TOKEN',
  'DISCORD_CLIENT_ID',
  'DISCORD_GUILD_ID',
  'LOG_DEBUG_CATEGORIES',
  'LOG_JSON',
  'NODE_ENV',
  'WEB_URL',
] as const

function withDiscordEnv(overrides: Partial<Record<(typeof DISCORD_ENV_KEYS)[number], string | undefined>> = {}) {
  const previousEnv = new Map<string, string | undefined>()

  for (const key of DISCORD_ENV_KEYS) {
    previousEnv.set(key, process.env[key])
  }

  Object.assign(process.env, {
    API_URL: 'http://127.0.0.1:3000',
    NODE_ENV: 'development',
  })

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key]
      continue
    }

    process.env[key] = value
  }

  return () => {
    for (const key of DISCORD_ENV_KEYS) {
      const previousValue = previousEnv.get(key)

      if (previousValue === undefined) {
        delete process.env[key]
        continue
      }

      process.env[key] = previousValue
    }
  }
}

describe('discord env', () => {
  test('defaults DISCORD_BOT_START to true and leaves Discord secrets optional', async () => {
    const restoreEnv = withDiscordEnv({
      DISCORD_BOT_START: undefined,
      DISCORD_BOT_TOKEN: undefined,
      DISCORD_CLIENT_ID: undefined,
      DISCORD_GUILD_ID: undefined,
      WEB_URL: undefined,
    })

    try {
      const { env } = await import(`../src/discord.ts?test=${Date.now()}-default`)

      expect(env.DISCORD_BOT_START).toBe(true)
      expect(env.DISCORD_BOT_TOKEN).toBeUndefined()
      expect(env.DISCORD_CLIENT_ID).toBeUndefined()
      expect(env.DISCORD_GUILD_ID).toBeUndefined()
      expect(env.LOG_DEBUG_CATEGORIES).toEqual([])
      expect(env.LOG_JSON).toBe(true)
      expect(env.WEB_URL).toBeUndefined()
    } finally {
      restoreEnv()
    }
  })

  test('parses DISCORD_BOT_START=false', async () => {
    const restoreEnv = withDiscordEnv({
      DISCORD_BOT_START: 'false',
    })

    try {
      const { env } = await import(`../src/discord.ts?test=${Date.now()}-false`)

      expect(env.DISCORD_BOT_START).toBe(false)
    } finally {
      restoreEnv()
    }
  })

  test('parses API_URL and optional WEB_URL', async () => {
    const restoreEnv = withDiscordEnv({
      API_URL: 'https://api.example.com',
      WEB_URL: 'https://app.example.com',
    })

    try {
      const { env } = await import(`../src/discord.ts?test=${Date.now()}-urls`)

      expect(env.API_URL).toBe('https://api.example.com')
      expect(env.WEB_URL).toBe('https://app.example.com')
    } finally {
      restoreEnv()
    }
  })

  test('parses LOG_DEBUG_CATEGORIES', async () => {
    const restoreEnv = withDiscordEnv({
      LOG_DEBUG_CATEGORIES: 'indexer,asset-index',
    })

    try {
      const { env } = await import(`../src/discord.ts?test=${Date.now()}-debug-categories`)

      expect(env.LOG_DEBUG_CATEGORIES).toEqual(['asset-index', 'indexer'])
    } finally {
      restoreEnv()
    }
  })

  test('parses LOG_JSON=false', async () => {
    const restoreEnv = withDiscordEnv({
      LOG_JSON: 'false',
    })

    try {
      const { env } = await import(`../src/discord.ts?test=${Date.now()}-log-json-false`)

      expect(env.LOG_JSON).toBe(false)
    } finally {
      restoreEnv()
    }
  })
})
