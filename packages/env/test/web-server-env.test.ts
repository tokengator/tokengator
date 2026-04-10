import { describe, expect, test } from 'bun:test'

const WEB_SERVER_ENV_KEYS = ['API_URL', 'BETTER_AUTH_URL'] as const

function withWebServerEnv(overrides: Partial<Record<(typeof WEB_SERVER_ENV_KEYS)[number], string | undefined>> = {}) {
  const previousEnv = new Map<string, string | undefined>()

  for (const key of WEB_SERVER_ENV_KEYS) {
    previousEnv.set(key, process.env[key])
  }

  Object.assign(process.env, {
    API_URL: 'http://127.0.0.1:4000',
    BETTER_AUTH_URL: 'http://127.0.0.1:3000',
  })

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key]
      continue
    }

    process.env[key] = value
  }

  return () => {
    for (const key of WEB_SERVER_ENV_KEYS) {
      const previousValue = previousEnv.get(key)

      if (previousValue === undefined) {
        delete process.env[key]
        continue
      }

      process.env[key] = previousValue
    }
  }
}

describe('web server env', () => {
  test('prefers API_URL when it is set', async () => {
    const restoreEnv = withWebServerEnv()

    try {
      const { env } = await import(`../src/web-server.ts?test=${Date.now()}-api-url`)

      expect(env.API_URL).toBe('http://127.0.0.1:4000')
    } finally {
      restoreEnv()
    }
  })

  test('falls back to BETTER_AUTH_URL when API_URL is unset', async () => {
    const restoreEnv = withWebServerEnv({
      API_URL: undefined,
    })

    try {
      const { env } = await import(`../src/web-server.ts?test=${Date.now()}-better-auth-url`)

      expect(env.API_URL).toBe('http://127.0.0.1:3000')
    } finally {
      restoreEnv()
    }
  })
})
