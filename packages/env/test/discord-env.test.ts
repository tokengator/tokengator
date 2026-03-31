import { describe, expect, test } from 'bun:test'

const DISCORD_ENV_KEYS = [
  'DISCORD_BOT_START',
  'DISCORD_BOT_TOKEN',
  'DISCORD_CLIENT_ID',
  'DISCORD_GUILD_ID',
  'NODE_ENV',
] as const

function withDiscordEnv(overrides: Partial<Record<(typeof DISCORD_ENV_KEYS)[number], string | undefined>> = {}) {
  const previousEnv = new Map<string, string | undefined>()

  for (const key of DISCORD_ENV_KEYS) {
    previousEnv.set(key, process.env[key])
  }

  Object.assign(process.env, {
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
    })

    try {
      const { env } = await import(`../src/discord.ts?test=${Date.now()}-default`)

      expect(env.DISCORD_BOT_START).toBe(true)
      expect(env.DISCORD_BOT_TOKEN).toBeUndefined()
      expect(env.DISCORD_CLIENT_ID).toBeUndefined()
      expect(env.DISCORD_GUILD_ID).toBeUndefined()
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
})
