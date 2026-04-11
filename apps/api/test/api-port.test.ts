import { describe, expect, test } from 'bun:test'

import { getApiPort } from '../src/get-api-port'

function withApiPortEnv(overrides: { API_PORT?: string; PORT?: string } = {}) {
  const previousApiPort = process.env.API_PORT
  const previousPort = process.env.PORT

  if (overrides.API_PORT === undefined) {
    delete process.env.API_PORT
  } else {
    process.env.API_PORT = overrides.API_PORT
  }

  if (overrides.PORT === undefined) {
    delete process.env.PORT
  } else {
    process.env.PORT = overrides.PORT
  }

  return () => {
    if (previousApiPort === undefined) {
      delete process.env.API_PORT
    } else {
      process.env.API_PORT = previousApiPort
    }

    if (previousPort === undefined) {
      delete process.env.PORT
    } else {
      process.env.PORT = previousPort
    }
  }
}

describe('getApiPort', () => {
  test('defaults to 3000 when API_PORT and PORT are unset', () => {
    const restoreEnv = withApiPortEnv()

    try {
      expect(getApiPort()).toBe(3000)
    } finally {
      restoreEnv()
    }
  })

  test('falls back to PORT when API_PORT is unset', () => {
    const restoreEnv = withApiPortEnv({
      PORT: '4100',
    })

    try {
      expect(getApiPort()).toBe(4100)
    } finally {
      restoreEnv()
    }
  })

  test('prefers API_PORT when it is set', () => {
    const restoreEnv = withApiPortEnv({
      API_PORT: '4200',
      PORT: '4100',
    })

    try {
      expect(getApiPort()).toBe(4200)
    } finally {
      restoreEnv()
    }
  })
})
