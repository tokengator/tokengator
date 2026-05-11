import { afterEach, describe, expect, mock, test } from 'bun:test'
import { writeFileSync } from 'node:fs'

import { authFeatureLogout } from '../../src/auth/auth-feature-logout'
import type { AuthApiFetch } from '../../src/auth/data-access/auth-api-client'
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

afterEach(() => {
  console.log = originalConsoleLog
  cleanupTempConfigHomes()
})

describe('auth feature logout', () => {
  test('prints revoke failure details in verbose mode', async () => {
    const configPath = getTempConfigPath(createTempConfigHome())

    writeFileSync(
      configPath,
      JSON.stringify(
        {
          activeProfile: 'default',
          profiles: {
            default: {
              apiKey: 'tg_cli_secret',
              apiKeyId: 'key-id',
              apiUrl: 'https://api.example.com',
            },
          },
        },
        null,
        2,
      ),
    )

    const fetch = (async () =>
      createJsonResponse(
        {
          message: 'API key revoke failed.',
        },
        500,
      )) satisfies AuthApiFetch
    const messages: string[] = []

    console.log = mock((message: string) => {
      messages.push(message)
    }) as typeof console.log

    await authFeatureLogout({
      configPath,
      fetch,
      verbose: true,
    })

    expect(messages).toEqual([
      'Logged out profile "default".',
      'Remote API key revoke failed or the key was already invalid; local credentials were cleared.',
      'API key revoke failed.',
      'HTTP status: 500',
      'Request: POST https://api.example.com/api/auth/api-key/delete',
      'Response content-type: application/json',
      'Response body: {"message":"API key revoke failed."}',
    ])
  })
})
