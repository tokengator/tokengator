import { describe, expect, test } from 'bun:test'

function withViteServerPortEnv(port?: string) {
  const previousPort = process.env.VITE_SERVER_PORT

  if (port === undefined) {
    delete process.env.VITE_SERVER_PORT
  } else {
    process.env.VITE_SERVER_PORT = port
  }

  return () => {
    if (previousPort === undefined) {
      delete process.env.VITE_SERVER_PORT
    } else {
      process.env.VITE_SERVER_PORT = previousPort
    }
  }
}

describe('vite config', () => {
  test('defaults the dev server port to 3001', async () => {
    const restoreEnv = withViteServerPortEnv()

    try {
      const { default: config } = await import(`../vite.config.ts?test=${Date.now()}-default-port`)

      expect(config.server?.port).toBe(3001)
    } finally {
      restoreEnv()
    }
  })

  test('uses VITE_SERVER_PORT when it is set', async () => {
    const restoreEnv = withViteServerPortEnv('4101')

    try {
      const { default: config } = await import(`../vite.config.ts?test=${Date.now()}-env-port`)

      expect(config.server?.port).toBe(4101)
    } finally {
      restoreEnv()
    }
  })
})
