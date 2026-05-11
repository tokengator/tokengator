import { afterEach, describe, expect, mock, test } from 'bun:test'
import { writeFileSync } from 'node:fs'

import { authFeatureLogin } from '../../src/auth/auth-feature-login'
import type { AuthApiFetch } from '../../src/auth/data-access/auth-api-client'
import { readConfig } from '../../src/config/data-access/config-store'
import { cleanupTempConfigHomes, createTempConfigHome, getTempConfigPath } from '../config/config-test-utils'

const originalConsoleLog = console.log

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json',
    },
    status,
  })
}

function createLoginFetch() {
  const requests: Array<{ body: unknown; headers: Headers; method?: string; path: string }> = []
  const fetch = (async (input, init) => {
    const path = new URL(String(input)).pathname
    requests.push({
      body: init?.body ? JSON.parse(String(init.body)) : null,
      headers: new Headers(init?.headers),
      method: init?.method,
      path,
    })

    if (path === '/api/auth/device/code') {
      return createJsonResponse({
        device_code: 'device-code',
        expires_in: 900,
        interval: 1,
        user_code: 'ABCD1234',
        verification_uri: 'https://app.example.com/cli/authorize',
        verification_uri_complete: 'https://app.example.com/cli/authorize?user_code=ABCD1234',
      })
    }

    if (path === '/api/auth/device/token') {
      return createJsonResponse({
        access_token: 'device-access-token',
        expires_in: 604800,
        scope: 'cli',
        token_type: 'Bearer',
      })
    }

    if (path === '/api/auth/api-key/create') {
      return createJsonResponse({
        data: {
          id: 'new-key-id',
          key: 'tg_cli_new_secret',
          name: 'Tokengator CLI: default on test-host',
        },
      })
    }

    if (path === '/api/auth/get-session') {
      return createJsonResponse({
        session: {
          id: 'session-id',
          userId: 'user-2',
        },
        user: {
          id: 'user-2',
          username: null,
        },
      })
    }

    throw new Error(`Unexpected auth request: ${init?.method ?? 'GET'} ${path}`)
  }) satisfies AuthApiFetch

  return { fetch, requests }
}

afterEach(() => {
  console.log = originalConsoleLog
  cleanupTempConfigHomes()
})

describe('auth feature login', () => {
  test('clears stale username when re-login session has no username', async () => {
    const configPath = getTempConfigPath(createTempConfigHome())

    writeFileSync(
      configPath,
      JSON.stringify(
        {
          activeProfile: 'default',
          profiles: {
            default: {
              apiKey: 'tg_cli_old_secret',
              apiKeyId: 'old-key-id',
              apiKeyName: 'Old CLI key',
              apiUrl: 'https://api.example.com',
              authenticatedAt: '2026-04-26T00:00:00.000Z',
              token: 'legacy-token',
              userId: 'user-1',
              username: 'alice',
            },
          },
        },
        null,
        2,
      ),
    )

    const { fetch, requests } = createLoginFetch()
    console.log = mock(() => {}) as typeof console.log

    await authFeatureLogin({ configPath, fetch, noOpen: true })

    expect(readConfig(configPath).profiles.default).toEqual({
      apiKey: 'tg_cli_new_secret',
      apiKeyId: 'new-key-id',
      apiKeyName: 'Tokengator CLI: default on test-host',
      apiUrl: 'https://api.example.com',
      authenticatedAt: expect.any(String),
      token: 'legacy-token',
      userId: 'user-2',
    })
    expect(requests.map((request) => request.path)).toEqual([
      '/api/auth/device/code',
      '/api/auth/device/token',
      '/api/auth/api-key/create',
      '/api/auth/get-session',
    ])
    expect(requests[2]?.body).toMatchObject({
      configId: 'cli',
      metadata: {
        clientId: 'tokengator-cli',
      },
    })
    expect((requests[2]?.body as { name?: string } | null)?.name?.startsWith('Tokengator CLI: default on ')).toBe(true)
  })
})
