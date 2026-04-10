import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import type { AppConfig } from '../src'

const ENV_KEYS = [
  'API_URL',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_SOLANA_SIGN_IN_ENABLED',
  'CORS_ORIGINS',
  'DATABASE_AUTH_TOKEN',
  'DATABASE_URL',
  'DISCORD_BOT_TOKEN',
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'HELIUS_API_KEY',
  'HELIUS_CLUSTER',
  'NODE_ENV',
  'SOLANA_CLUSTER',
  'SOLANA_ENDPOINT_PUBLIC',
  'WEB_URL',
] as const
const PREVIOUS_ENV = {} as Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>
const TEST_DATABASE_DIR = mkdtempSync(resolve(tmpdir(), 'tokengator-api-tests-'))
const TEST_DATABASE_URL = pathToFileURL(resolve(TEST_DATABASE_DIR, 'core-env.sqlite')).toString()

let createApiApp: (typeof import('../src/app'))['createApiApp']

beforeAll(async () => {
  for (const key of ENV_KEYS) {
    PREVIOUS_ENV[key] = process.env[key]
  }

  process.env.API_URL = 'http://127.0.0.1:3000'
  process.env.BETTER_AUTH_SECRET = '12345678901234567890123456789012'
  process.env.BETTER_AUTH_SOLANA_SIGN_IN_ENABLED = 'true'
  process.env.CORS_ORIGINS = 'http://127.0.0.1:3001'
  process.env.DATABASE_AUTH_TOKEN = 'test-token'
  process.env.DATABASE_URL = TEST_DATABASE_URL
  process.env.DISCORD_BOT_TOKEN = 'discord-bot-token'
  process.env.DISCORD_CLIENT_ID = 'discord-client-id'
  process.env.DISCORD_CLIENT_SECRET = 'discord-client-secret'
  process.env.HELIUS_API_KEY = 'helius-api-key'
  process.env.HELIUS_CLUSTER = 'devnet'
  process.env.NODE_ENV = 'test'
  process.env.SOLANA_CLUSTER = 'devnet'
  process.env.SOLANA_ENDPOINT_PUBLIC = 'https://api.devnet.solana.com'
  delete process.env.WEB_URL

  ;({ createApiApp } = await import('../src/app'))
})

afterAll(() => {
  for (const key of ENV_KEYS) {
    const previousValue = PREVIOUS_ENV[key]

    if (previousValue === undefined) {
      delete process.env[key]
      continue
    }

    process.env[key] = previousValue
  }

  rmSync(TEST_DATABASE_DIR, {
    force: true,
    recursive: true,
  })
})

function getExpectedAppConfig(): AppConfig {
  return {
    appOrigin: 'http://127.0.0.1:3000',
    solanaCluster: 'devnet',
    solanaEndpoint: 'https://api.devnet.solana.com',
    solanaSignInEnabled: true,
  }
}

function loadCoreAppConfig(overrides: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {}) {
  const env = {
    ...process.env,
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete env[key]
      continue
    }

    env[key] = value
  }

  const moduleUrl = new URL('../src/features/core/data-access/get-core-app-config.ts', import.meta.url).href
  const result = Bun.spawnSync({
    cmd: [
      'bun',
      '--eval',
      `const { getCoreAppConfig } = await import(${JSON.stringify(moduleUrl)}); console.log(JSON.stringify(getCoreAppConfig()))`,
    ],
    env,
    stderr: 'pipe',
    stdout: 'pipe',
  })

  if (result.exitCode !== 0) {
    throw new Error(Buffer.from(result.stderr).toString('utf8').trim() || 'Failed to load core app config')
  }

  return JSON.parse(Buffer.from(result.stdout).toString('utf8')) as AppConfig
}

describe('core env endpoints', () => {
  test('getCoreAppConfig falls back to API_URL when WEB_URL is unset', () => {
    const appConfig = loadCoreAppConfig({
      API_URL: 'https://api.example.com/base?via=test',
      WEB_URL: undefined,
    })

    expect(appConfig.appOrigin).toBe('https://api.example.com')
  })

  test('getCoreAppConfig prefers WEB_URL when it is set', () => {
    const appConfig = loadCoreAppConfig({
      API_URL: 'https://api.example.com/base?via=test',
      WEB_URL: 'https://app.example.com/onboard?from=discord',
    })

    expect(appConfig.appOrigin).toBe('https://app.example.com')
  })

  test('GET /api/__/env.json returns app config as JSON', async () => {
    const app = createApiApp()
    const response = await app.request('http://localhost/api/__/env.json')

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8')
    expect(await response.json()).toEqual(getExpectedAppConfig())
  })

  test('GET /api/__/env.js returns a script that assigns globalThis.__env', async () => {
    const app = createApiApp()
    const response = await app.request('http://localhost/api/__/env.js')
    const previousEnv = (globalThis as { __env?: AppConfig }).__env
    const source = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('content-type')).toBe('application/javascript; charset=utf-8')

    delete (globalThis as { __env?: AppConfig }).__env
    new Function(source)()

    expect((globalThis as { __env?: AppConfig }).__env).toEqual(getExpectedAppConfig())

    if (previousEnv) {
      ;(globalThis as { __env?: AppConfig }).__env = previousEnv
      return
    }

    delete (globalThis as { __env?: AppConfig }).__env
  })
})
