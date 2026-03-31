import { createKeyPairSignerFromBytes, getBase58Decoder, signBytes } from '@solana/kit'
import { createSIWSInput, siwsClient } from 'better-auth-solana/client'
import { createAuthClient } from 'better-auth/client'
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { alice, bob, type TestUser } from '@tokengator/db/dev-seed-users'

import { createOrpcClient, type OrpcClientFetch } from '../src/index'

const DB_PACKAGE_DIR = resolve(import.meta.dir, '..', '..', 'db')
const SIWS_STATEMENT = 'Sign in to Tokengator'

const seededUsers = {
  alice: {
    email: 'alice@example.com',
    fixture: alice,
    role: 'admin',
    username: 'alice',
  },
  bob: {
    email: 'bob@example.com',
    fixture: bob,
    role: 'user',
    username: 'bob',
  },
} as const

type DatabaseClient = (typeof import('@tokengator/db'))['db']
type SeededUserKey = keyof typeof seededUsers

let database: DatabaseClient

function buildCookieHeader(cookieJar: Map<string, string>) {
  return [...cookieJar.values()].sort((left, right) => left.localeCompare(right)).join('; ')
}

function createCookieFetch(): OrpcClientFetch {
  const cookieJar = new Map<string, string>()

  return async (input, init) => {
    const existingCookieHeader = new Headers(init?.headers).get('cookie')
    const nextHeaders = new Headers(init?.headers)
    const storedCookieHeader = buildCookieHeader(cookieJar)
    const cookieHeader = [existingCookieHeader, storedCookieHeader].filter(Boolean).join('; ')

    if (cookieHeader) {
      nextHeaders.set('cookie', cookieHeader)
    }

    const response = await fetch(input, {
      ...init,
      headers: nextHeaders,
    })
    const setCookies = 'getSetCookie' in response.headers ? response.headers.getSetCookie() : []

    for (const setCookie of setCookies) {
      const firstSegment = setCookie.split(';', 1)[0] ?? ''
      const separatorIndex = firstSegment.indexOf('=')

      if (separatorIndex === -1) {
        continue
      }

      const name = firstSegment.slice(0, separatorIndex).trim()
      const value = firstSegment.slice(separatorIndex + 1).trim()

      if (!name) {
        continue
      }

      cookieJar.set(name, `${name}=${value}`)
    }

    return response
  }
}

function createSiwsSessionClients(baseUrl: string) {
  const cookieFetch = createCookieFetch()

  return {
    authClient: createAuthClient({
      baseURL: baseUrl,
      fetchOptions: {
        credentials: 'include',
        customFetchImpl: cookieFetch,
      },
      plugins: [siwsClient()],
    }),
    client: createOrpcClient({
      baseUrl,
      fetch: cookieFetch,
    }),
  }
}

function decodeOutput(buffer: Uint8Array | undefined) {
  return buffer ? Buffer.from(buffer).toString('utf8').trim() : ''
}

function formatSiwsMessage(input: ReturnType<typeof createSIWSInput>) {
  return [
    `${input.domain} wants you to sign in with your Solana account:`,
    input.address,
    '',
    input.statement,
    '',
    `URI: ${input.uri}`,
    `Version: ${input.version}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt}`,
    `Expiration Time: ${input.expirationTime}`,
  ].join('\n')
}

async function getAvailablePort() {
  return await new Promise<number>((resolvePromise, rejectPromise) => {
    const portServer = createServer()

    portServer.on('error', rejectPromise)
    portServer.listen(0, '127.0.0.1', () => {
      const address = portServer.address()

      if (!address || typeof address === 'string') {
        rejectPromise(new Error('Unable to determine an available port.'))
        return
      }

      portServer.close((closeError) => {
        if (closeError) {
          rejectPromise(closeError)
          return
        }

        resolvePromise(address.port)
      })
    })
  })
}

async function getSeededUserByEmail(email: string) {
  const { user } = await import('@tokengator/db/schema/auth')
  const users = await database.select().from(user)

  return users.find((entry) => entry.email === email) ?? null
}

async function getUserCount() {
  const { user } = await import('@tokengator/db/schema/auth')

  return (await database.select().from(user)).length
}

async function signInWithSiws(
  authClient: ReturnType<typeof createSiwsSessionClients>['authClient'],
  fixture: TestUser,
) {
  const { data: challenge, error: challengeError } = await authClient.siws.nonce({
    walletAddress: fixture.solana.publicKey,
  })

  if (!challenge) {
    throw new Error(challengeError?.message ?? 'Failed to request SIWS challenge.')
  }

  const input = createSIWSInput({
    address: fixture.solana.publicKey,
    challenge,
    statement: SIWS_STATEMENT,
  })
  const message = formatSiwsMessage(input)
  const signer = await createKeyPairSignerFromBytes(new Uint8Array(fixture.solana.secret))

  if (signer.address !== fixture.solana.publicKey) {
    throw new Error(`Fixture public key mismatch for ${fixture.username}.`)
  }

  const signatureBytes = await signBytes(signer.keyPair.privateKey, new TextEncoder().encode(message))
  const signature = getBase58Decoder().decode(signatureBytes)
  const { data, error } = await authClient.siws.verify({
    message,
    signature,
    walletAddress: fixture.solana.publicKey,
  })

  if (!data) {
    throw new Error(error?.message ?? 'Failed to verify SIWS login.')
  }

  return data
}

function syncDatabase(databaseUrl: string) {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', 'db:push', '--force'],
    cwd: DB_PACKAGE_DIR,
    env: {
      ...process.env,
      DATABASE_AUTH_TOKEN: 'test-token',
      DATABASE_URL: databaseUrl,
    },
    stderr: 'pipe',
    stdout: 'pipe',
  })

  if (result.exitCode !== 0) {
    const stderr = decodeOutput(result.stderr)
    const stdout = decodeOutput(result.stdout)

    throw new Error(`Failed to sync the test database.\n${stdout}\n${stderr}`)
  }
}

async function runSiwsLoginCheck(userKey: SeededUserKey) {
  const seededUser = seededUsers[userKey]
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tempDir = mkdtempSync(resolve(tmpdir(), `tokengator-sdk-siws-${userKey}-`))
  const databaseUrl = pathToFileURL(resolve(tempDir, 'test.sqlite')).toString()

  process.env.BETTER_AUTH_SECRET = '12345678901234567890123456789012'
  process.env.BETTER_AUTH_SOLANA_SIGN_IN_ENABLED = 'true'
  process.env.BETTER_AUTH_URL = baseUrl
  process.env.CORS_ORIGINS = 'http://127.0.0.1:3001'
  process.env.DATABASE_AUTH_TOKEN = 'test-token'
  process.env.DATABASE_URL = databaseUrl
  process.env.DISCORD_CLIENT_ID = 'discord-client-id'
  process.env.DISCORD_CLIENT_SECRET = 'discord-client-secret'
  process.env.HELIUS_API_KEY = 'helius-api-key'
  process.env.HELIUS_CLUSTER = 'devnet'
  process.env.NODE_ENV = 'test'
  process.env.SOLANA_ADMIN_ADDRESSES = ''
  process.env.SOLANA_CLUSTER = 'devnet'
  process.env.SOLANA_ENDPOINT_PUBLIC = 'https://api.devnet.solana.com'

  syncDatabase(databaseUrl)

  let localServer: Bun.Server<unknown> | undefined

  try {
    ;({ db: database } = await import('@tokengator/db'))

    const { seedDatabase } = await import('@tokengator/db/seed')
    const seedResult = await seedDatabase()

    if (seedResult.skipped) {
      throw new Error('Expected the SIWS e2e database seed to populate an empty test database.')
    }

    const { createApiApp } = await import('@tokengator/api/app')
    const app = createApiApp()

    localServer = Bun.serve({
      fetch: app.fetch,
      hostname: '127.0.0.1',
      port,
    })

    const session = createSiwsSessionClients(baseUrl)
    const seededAccount = await getSeededUserByEmail(seededUser.email)

    if (!seededAccount) {
      throw new Error(`Missing seeded user ${seededUser.email}.`)
    }

    const verificationResult = await signInWithSiws(session.authClient, seededUser.fixture)
    const sessionResult = await session.authClient.getSession()
    const wallets = await session.client.profile.listSolanaWallets()

    return {
      sessionUser: sessionResult.data?.user ?? null,
      userCount: await getUserCount(),
      verificationUser: verificationResult.user,
      wallets: wallets.solanaWallets,
    }
  } finally {
    localServer?.stop(true)
    rmSync(tempDir, {
      force: true,
      recursive: true,
    })
  }
}

if (import.meta.main) {
  const userKey = Bun.argv[2]

  if (userKey !== 'alice' && userKey !== 'bob') {
    throw new Error(`Expected alice or bob, received ${userKey ?? 'nothing'}.`)
  }

  try {
    const result = await runSiwsLoginCheck(userKey)

    console.log(`RESULT:${JSON.stringify(result)}`)
  } catch (error) {
    console.error(error instanceof Error ? (error.stack ?? error.message) : String(error))
    process.exit(1)
  }
}
