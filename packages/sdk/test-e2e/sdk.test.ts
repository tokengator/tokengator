import { createAuthClient } from 'better-auth/client'
import { usernameClient } from 'better-auth/client/plugins'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { createOrpcClient, type OrpcClient, type OrpcClientFetch } from '../src/index'

const ALICE_EMAIL = 'alice@example.com'
const ALICE_NAME = 'Alice'
const ALICE_USERNAME = 'alice'
const BOB_EMAIL = 'bob@example.com'
const BOB_NAME = 'Bob'
const BOB_ORGANIZATION_NAME = 'Bob Org'
const BOB_ORGANIZATION_SLUG = 'bob-org'
const BOB_USERNAME = 'bob'
const CAROL_EMAIL = 'carol@example.com'
const CAROL_NAME = 'Carol'
const CAROL_ORGANIZATION_NAME = 'Carol Org'
const CAROL_ORGANIZATION_SLUG = 'carol-org'
const CAROL_USERNAME = 'carol'
const ORGANIZATION_NAME = 'Acme'
const ORGANIZATION_SLUG = 'acme'
const ROOT_DIR = resolve(import.meta.dir, '..', '..', '..')
const DB_PACKAGE_DIR = resolve(ROOT_DIR, 'packages', 'db')
const USER_PASSWORD = 'password123'

type DatabaseClient = (typeof import('@tokengator/db'))['db']

let adminSession: SessionClients
let anonymousClient: OrpcClient
let baseUrl = ''
let bobSession: SessionClients
let carolSession: SessionClients
let database: DatabaseClient
let server: Bun.Server<unknown> | undefined
let tempDir = ''

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

function createSessionClients(nextBaseUrl: string) {
  const cookieFetch = createCookieFetch()

  return {
    authClient: createAuthClient({
      baseURL: nextBaseUrl,
      fetchOptions: {
        credentials: 'include',
        customFetchImpl: cookieFetch,
      },
      plugins: [usernameClient()],
    }),
    client: createOrpcClient({
      baseUrl: nextBaseUrl,
      fetch: cookieFetch,
    }),
  }
}

type SessionClients = ReturnType<typeof createSessionClients>

function decodeOutput(buffer: Uint8Array | undefined) {
  return buffer ? Buffer.from(buffer).toString('utf8').trim() : ''
}

function ellipsifySolanaWalletAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-6)}`
}

async function expectORPCError(
  promise: Promise<unknown>,
  expected: {
    code: string
    message?: string
    status: number
  },
) {
  try {
    await promise
  } catch (error) {
    expect(error).toMatchObject(expected)

    return error
  }

  throw new Error(`Expected promise to reject with ${expected.code}.`)
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

async function signUpAndSignIn(
  authClient: SessionClients['authClient'],
  profile: {
    email: string
    name: string
    password: string
    username: string
  },
) {
  await authClient.signUp.email({
    email: profile.email,
    name: profile.name,
    password: profile.password,
    username: profile.username,
  })
  await authClient.signIn.email({
    email: profile.email,
    password: profile.password,
  })
}

async function getOwnerCandidateByEmail(email: string) {
  const ownerCandidates = await adminSession.client.adminOrganization.listOwnerCandidates({
    search: email,
  })

  return ownerCandidates.find((entry) => entry.email === email) ?? null
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

beforeAll(async () => {
  const port = await getAvailablePort()

  baseUrl = `http://127.0.0.1:${port}`
  tempDir = mkdtempSync(resolve(tmpdir(), 'tokengator-sdk-e2e-'))

  const databaseUrl = pathToFileURL(resolve(tempDir, 'test.sqlite')).toString()

  process.env.BETTER_AUTH_ADMIN_EMAILS = ALICE_EMAIL
  process.env.BETTER_AUTH_SECRET = '12345678901234567890123456789012'
  process.env.BETTER_AUTH_URL = baseUrl
  process.env.CORS_ORIGINS = 'http://127.0.0.1:3001'
  process.env.DATABASE_AUTH_TOKEN = 'test-token'
  process.env.DATABASE_URL = databaseUrl
  process.env.DISCORD_CLIENT_ID = 'discord-client-id'
  process.env.DISCORD_CLIENT_SECRET = 'discord-client-secret'
  process.env.NODE_ENV = 'test'
  process.env.SOLANA_CLUSTER = 'devnet'
  process.env.SOLANA_ENDPOINT_PUBLIC = 'https://api.devnet.solana.com'

  ;({ db: database } = await import('@tokengator/db'))

  syncDatabase(databaseUrl)

  const { createApiApp } = await import('@tokengator/api/app')
  const app = createApiApp()

  server = Bun.serve({
    fetch: app.fetch,
    hostname: '127.0.0.1',
    port,
  })

  adminSession = createSessionClients(baseUrl)
  anonymousClient = createOrpcClient({
    baseUrl,
  })
  bobSession = createSessionClients(baseUrl)
  carolSession = createSessionClients(baseUrl)

  await signUpAndSignIn(adminSession.authClient, {
    email: ALICE_EMAIL,
    name: ALICE_NAME,
    password: USER_PASSWORD,
    username: ALICE_USERNAME,
  })
  await signUpAndSignIn(bobSession.authClient, {
    email: BOB_EMAIL,
    name: BOB_NAME,
    password: USER_PASSWORD,
    username: BOB_USERNAME,
  })
  await signUpAndSignIn(carolSession.authClient, {
    email: CAROL_EMAIL,
    name: CAROL_NAME,
    password: USER_PASSWORD,
    username: CAROL_USERNAME,
  })
})

afterAll(() => {
  server?.stop(true)

  if (tempDir) {
    rmSync(tempDir, {
      force: true,
      recursive: true,
    })
  }
})

describe('createOrpcClient e2e', () => {
  test('health check succeeds', async () => {
    await expect(anonymousClient.healthCheck()).resolves.toBe('OK')
  })

  test('preserves the base URL pathname when deriving the RPC endpoint', async () => {
    let requestedUrl = ''
    const client = createOrpcClient({
      baseUrl: 'https://example.com/app/',
      fetch: async (input) => {
        requestedUrl = input instanceof Request ? input.url : input.toString()

        throw new Error('stop')
      },
    })

    await expect(client.healthCheck()).rejects.toThrow('stop')
    expect(requestedUrl).toBe('https://example.com/app/rpc/healthCheck')
  })

  test('anonymous access to privateData is rejected', async () => {
    await expectORPCError(anonymousClient.privateData(), {
      code: 'UNAUTHORIZED',
      status: 401,
    })
  })

  test('session includes username and username sign-in succeeds', async () => {
    const session = await bobSession.authClient.getSession()
    const usernameSession = createSessionClients(baseUrl)

    expect(session).toMatchObject({
      data: {
        user: {
          email: BOB_EMAIL,
          name: BOB_NAME,
          username: BOB_USERNAME,
        },
      },
      error: null,
    })

    await usernameSession.authClient.signIn.username({
      password: USER_PASSWORD,
      username: BOB_USERNAME,
    })

    await expect(usernameSession.authClient.getSession()).resolves.toMatchObject({
      data: {
        user: {
          email: BOB_EMAIL,
          username: BOB_USERNAME,
        },
      },
      error: null,
    })
  })

  test('profile solana wallets support fallback names, guarded deletes, and owner-scoped updates', async () => {
    const [{ solanaWallet }, bobAuthSession] = await Promise.all([
      import('@tokengator/db/schema/auth'),
      bobSession.authClient.getSession(),
    ])
    const bobUserId = bobAuthSession.data?.user.id
    const primaryAddress = 'So11111111111111111111111111111111111111112'
    const secondaryAddress = 'Vote111111111111111111111111111111111111111'
    const tertiaryAddress = 'Zed1111111111111111111111111111111111111111'

    expect(bobUserId).toBeDefined()

    await database.insert(solanaWallet).values([
      {
        address: primaryAddress,
        isPrimary: true,
        userId: bobUserId!,
      },
      {
        address: secondaryAddress,
        isPrimary: false,
        name: 'Treasury',
        userId: bobUserId!,
      },
      {
        address: tertiaryAddress,
        isPrimary: false,
        userId: bobUserId!,
      },
    ])

    await expect(bobSession.client.profile.listSolanaWallets()).resolves.toEqual({
      solanaWallets: [
        {
          address: primaryAddress,
          displayName: ellipsifySolanaWalletAddress(primaryAddress),
          id: expect.any(String),
          isPrimary: true,
          name: null,
        },
        {
          address: secondaryAddress,
          displayName: 'Treasury',
          id: expect.any(String),
          isPrimary: false,
          name: 'Treasury',
        },
        {
          address: tertiaryAddress,
          displayName: ellipsifySolanaWalletAddress(tertiaryAddress),
          id: expect.any(String),
          isPrimary: false,
          name: null,
        },
      ],
    })

    const walletToUpdate = (await bobSession.client.profile.listSolanaWallets()).solanaWallets[0]
    const walletToDelete = (await bobSession.client.profile.listSolanaWallets()).solanaWallets.find(
      (entry) => entry.address === tertiaryAddress,
    )

    expect(walletToUpdate).toBeDefined()
    expect(walletToDelete).toBeDefined()

    await expect(
      bobSession.client.profile.updateSolanaWallet({
        id: walletToUpdate!.id,
        name: 'Main wallet',
      }),
    ).resolves.toEqual({
      solanaWallet: {
        address: primaryAddress,
        displayName: 'Main wallet',
        id: walletToUpdate!.id,
        isPrimary: true,
        name: 'Main wallet',
      },
    })

    await expect(
      bobSession.client.profile.updateSolanaWallet({
        id: walletToUpdate!.id,
        name: '   ',
      }),
    ).resolves.toEqual({
      solanaWallet: {
        address: primaryAddress,
        displayName: ellipsifySolanaWalletAddress(primaryAddress),
        id: walletToUpdate!.id,
        isPrimary: true,
        name: null,
      },
    })

    await expectORPCError(
      bobSession.client.profile.deleteSolanaWallet({
        id: walletToUpdate!.id,
      }),
      {
        code: 'BAD_REQUEST',
        message: 'Primary Solana wallet cannot be deleted.',
        status: 400,
      },
    )

    await expect(
      bobSession.client.profile.deleteSolanaWallet({
        id: walletToDelete!.id,
      }),
    ).resolves.toEqual({
      solanaWalletId: walletToDelete!.id,
    })

    const secondaryWallet = (await bobSession.client.profile.listSolanaWallets()).solanaWallets.find(
      (entry) => entry.address === secondaryAddress,
    )

    expect(secondaryWallet).toBeDefined()

    await expect(
      bobSession.client.profile.setPrimarySolanaWallet({
        id: secondaryWallet!.id,
      }),
    ).resolves.toEqual({
      solanaWallet: {
        address: secondaryAddress,
        displayName: 'Treasury',
        id: secondaryWallet!.id,
        isPrimary: true,
        name: 'Treasury',
      },
    })

    await expect(bobSession.client.profile.listSolanaWallets()).resolves.toEqual({
      solanaWallets: [
        {
          address: primaryAddress,
          displayName: ellipsifySolanaWalletAddress(primaryAddress),
          id: walletToUpdate!.id,
          isPrimary: false,
          name: null,
        },
        {
          address: secondaryAddress,
          displayName: 'Treasury',
          id: secondaryWallet!.id,
          isPrimary: true,
          name: 'Treasury',
        },
      ],
    })

    await expectORPCError(
      carolSession.client.profile.deleteSolanaWallet({
        id: walletToDelete!.id,
      }),
      {
        code: 'NOT_FOUND',
        message: 'Solana wallet not found.',
        status: 404,
      },
    )

    await expectORPCError(
      carolSession.client.profile.updateSolanaWallet({
        id: walletToUpdate!.id,
        name: 'Carol wallet',
      }),
      {
        code: 'NOT_FOUND',
        message: 'Solana wallet not found.',
        status: 404,
      },
    )

    await expectORPCError(
      carolSession.client.profile.setPrimarySolanaWallet({
        id: secondaryWallet!.id,
      }),
      {
        code: 'NOT_FOUND',
        message: 'Solana wallet not found.',
        status: 404,
      },
    )
  })

  test('organization listMine returns read-only memberships', async () => {
    const bobOwner = await getOwnerCandidateByEmail(BOB_EMAIL)
    const carolOwner = await getOwnerCandidateByEmail(CAROL_EMAIL)

    expect(bobOwner).toBeDefined()
    expect(carolOwner).toBeDefined()

    const bobOrganization = await adminSession.client.adminOrganization.create({
      name: BOB_ORGANIZATION_NAME,
      ownerUserId: bobOwner!.id,
      slug: BOB_ORGANIZATION_SLUG,
    })
    const carolOrganization = await adminSession.client.adminOrganization.create({
      name: CAROL_ORGANIZATION_NAME,
      ownerUserId: carolOwner!.id,
      slug: CAROL_ORGANIZATION_SLUG,
    })

    await expect(bobSession.client.organization.listMine()).resolves.toEqual({
      organizations: [
        {
          id: bobOrganization.id,
          logo: null,
          name: BOB_ORGANIZATION_NAME,
          role: 'owner',
          slug: BOB_ORGANIZATION_SLUG,
        },
      ],
    })
    await expect(carolSession.client.organization.listMine()).resolves.toEqual({
      organizations: [
        {
          id: carolOrganization.id,
          logo: null,
          name: CAROL_ORGANIZATION_NAME,
          role: 'owner',
          slug: CAROL_ORGANIZATION_SLUG,
        },
      ],
    })
  })

  test('admin users can list organizations through the SDK', async () => {
    const ownerCandidate = await getOwnerCandidateByEmail(BOB_EMAIL)

    expect(ownerCandidate).toBeDefined()

    await adminSession.client.adminOrganization.create({
      name: ORGANIZATION_NAME,
      ownerUserId: ownerCandidate!.id,
      slug: ORGANIZATION_SLUG,
    })

    const organizations = await adminSession.client.adminOrganization.list()

    expect(organizations.organizations).toContainEqual(
      expect.objectContaining({
        memberCount: 1,
        name: ORGANIZATION_NAME,
        slug: ORGANIZATION_SLUG,
      }),
    )
  })

  test('admin users can manage asset groups and assets through the SDK', async () => {
    const [{ asset }, createdAssetGroup] = await Promise.all([
      import('@tokengator/db/schema/asset'),
      adminSession.client.adminAssetGroup.create({
        address: 'collection-acme',
        enabled: true,
        label: 'Acme Collection',
        type: 'collection',
      }),
    ])
    const indexedAt = new Date()
    const indexedAssetId = `v2:${JSON.stringify([createdAssetGroup.id, 'asset-acme-1', 'wallet-owner-1', 'helius-collection-assets'])}`
    const storedAssetId = crypto.randomUUID()

    await database.insert(asset).values({
      address: 'asset-acme-1',
      addressLower: 'asset-acme-1',
      amount: 1,
      assetGroupId: createdAssetGroup.id,
      firstSeenAt: indexedAt,
      id: storedAssetId,
      indexedAssetId,
      indexedAt,
      lastSeenAt: indexedAt,
      metadata: JSON.stringify({
        name: 'Asset 1',
      }),
      metadataJson: JSON.stringify({
        foo: 'bar',
      }),
      owner: 'wallet-owner-1',
      ownerLower: 'wallet-owner-1',
      page: 1,
      raw: JSON.stringify({
        source: 'indexer',
      }),
      resolverId: createdAssetGroup.id,
      resolverKind: 'helius-collection-assets',
    })

    await expect(
      adminSession.client.adminAssetGroup.get({ assetGroupId: createdAssetGroup.id }),
    ).resolves.toMatchObject({
      address: 'collection-acme',
      enabled: true,
      id: createdAssetGroup.id,
      label: 'Acme Collection',
      type: 'collection',
    })

    const assetGroups = await adminSession.client.adminAssetGroup.list()

    expect(assetGroups.assetGroups).toContainEqual(
      expect.objectContaining({
        address: 'collection-acme',
        enabled: true,
        id: createdAssetGroup.id,
        label: 'Acme Collection',
        type: 'collection',
      }),
    )

    await expect(adminSession.client.adminAsset.list({ assetGroupId: createdAssetGroup.id })).resolves.toMatchObject({
      assets: [
        expect.objectContaining({
          address: 'asset-acme-1',
          assetGroupId: createdAssetGroup.id,
          id: storedAssetId,
          metadata: {
            name: 'Asset 1',
          },
          metadataJson: {
            foo: 'bar',
          },
          owner: 'wallet-owner-1',
          raw: {
            source: 'indexer',
          },
          resolverKind: 'helius-collection-assets',
        }),
      ],
      limit: 50,
      offset: 0,
      total: 1,
    })

    await expect(
      adminSession.client.adminAssetGroup.update({
        assetGroupId: createdAssetGroup.id,
        data: {
          address: 'mint-acme',
          enabled: false,
          label: 'Acme Mint',
          type: 'mint',
        },
      }),
    ).resolves.toMatchObject({
      address: 'mint-acme',
      enabled: false,
      id: createdAssetGroup.id,
      label: 'Acme Mint',
      type: 'mint',
    })

    await expect(adminSession.client.adminAsset.delete({ id: storedAssetId })).resolves.toEqual({
      assetGroupId: createdAssetGroup.id,
      id: storedAssetId,
    })

    await expect(adminSession.client.adminAsset.list({ assetGroupId: createdAssetGroup.id })).resolves.toMatchObject({
      assets: [],
      limit: 50,
      offset: 0,
      total: 0,
    })

    await expect(adminSession.client.adminAssetGroup.delete({ assetGroupId: createdAssetGroup.id })).resolves.toEqual({
      assetGroupId: createdAssetGroup.id,
    })
  })

  test('admin search treats LIKE wildcards as literal characters', async () => {
    const percentMatchOwnerEmail = 'percent-match-owner@example.com'
    const percentMatchOwnerName = 'Percent 100% Owner'
    const percentNonMatchOwnerEmail = 'percent-non-match-owner@example.com'
    const percentNonMatchOwnerName = 'Percent 1000 Owner'
    const teamMatchOwnerEmail = 'team-match-owner@example.com'
    const teamMatchOwnerName = 'Team_1 Owner'
    const teamNonMatchOwnerEmail = 'team-non-match-owner@example.com'
    const teamNonMatchOwnerName = 'TeamA1 Owner'

    await signUpAndSignIn(createSessionClients(baseUrl).authClient, {
      email: percentMatchOwnerEmail,
      name: percentMatchOwnerName,
      password: USER_PASSWORD,
      username: 'percent.100',
    })
    await signUpAndSignIn(createSessionClients(baseUrl).authClient, {
      email: percentNonMatchOwnerEmail,
      name: percentNonMatchOwnerName,
      password: USER_PASSWORD,
      username: 'percent1000',
    })
    await signUpAndSignIn(createSessionClients(baseUrl).authClient, {
      email: teamMatchOwnerEmail,
      name: teamMatchOwnerName,
      password: USER_PASSWORD,
      username: 'team_1',
    })
    await signUpAndSignIn(createSessionClients(baseUrl).authClient, {
      email: teamNonMatchOwnerEmail,
      name: teamNonMatchOwnerName,
      password: USER_PASSWORD,
      username: 'teama1',
    })

    const percentMatchOwner = await getOwnerCandidateByEmail(percentMatchOwnerEmail)
    const percentNonMatchOwner = await getOwnerCandidateByEmail(percentNonMatchOwnerEmail)
    const teamMatchOwner = await getOwnerCandidateByEmail(teamMatchOwnerEmail)
    const teamNonMatchOwner = await getOwnerCandidateByEmail(teamNonMatchOwnerEmail)

    expect(percentMatchOwner).toBeDefined()
    expect(percentNonMatchOwner).toBeDefined()
    expect(teamMatchOwner).toBeDefined()
    expect(teamNonMatchOwner).toBeDefined()

    await adminSession.client.adminOrganization.create({
      name: 'Revenue 100%',
      ownerUserId: percentMatchOwner!.id,
      slug: 'revenue-100pct',
    })
    await adminSession.client.adminOrganization.create({
      name: 'Revenue 1000',
      ownerUserId: percentNonMatchOwner!.id,
      slug: 'revenue-1000',
    })
    await adminSession.client.adminOrganization.create({
      name: 'Team_1 Org',
      ownerUserId: teamMatchOwner!.id,
      slug: 'team_1-org',
    })
    await adminSession.client.adminOrganization.create({
      name: 'TeamA1 Org',
      ownerUserId: teamNonMatchOwner!.id,
      slug: 'teama1-org',
    })

    const ownerCandidatesWithPercent = await adminSession.client.adminOrganization.listOwnerCandidates({
      search: '100%',
    })
    const ownerCandidatesWithUnderscore = await adminSession.client.adminOrganization.listOwnerCandidates({
      search: 'Team_1',
    })
    const organizationsWithPercent = await adminSession.client.adminOrganization.list({
      search: '100%',
    })
    const organizationsWithUnderscore = await adminSession.client.adminOrganization.list({
      search: 'Team_1',
    })

    expect(ownerCandidatesWithPercent).toContainEqual(
      expect.objectContaining({
        email: percentMatchOwnerEmail,
        name: percentMatchOwnerName,
      }),
    )
    expect(ownerCandidatesWithPercent).not.toContainEqual(
      expect.objectContaining({
        email: percentNonMatchOwnerEmail,
      }),
    )
    expect(ownerCandidatesWithUnderscore).toContainEqual(
      expect.objectContaining({
        email: teamMatchOwnerEmail,
        name: teamMatchOwnerName,
      }),
    )
    expect(ownerCandidatesWithUnderscore).not.toContainEqual(
      expect.objectContaining({
        email: teamNonMatchOwnerEmail,
      }),
    )
    expect(organizationsWithPercent.organizations).toContainEqual(
      expect.objectContaining({
        name: 'Revenue 100%',
        slug: 'revenue-100pct',
      }),
    )
    expect(organizationsWithPercent.organizations).not.toContainEqual(
      expect.objectContaining({
        slug: 'revenue-1000',
      }),
    )
    expect(organizationsWithUnderscore.organizations).toContainEqual(
      expect.objectContaining({
        name: 'Team_1 Org',
        slug: 'team_1-org',
      }),
    )
    expect(organizationsWithUnderscore.organizations).not.toContainEqual(
      expect.objectContaining({
        slug: 'teama1-org',
      }),
    )
  })

  test('admin asset search treats LIKE wildcards as literal characters', async () => {
    const [{ asset }, percentGroup, percentNonMatchGroup, underscoreGroup, underscoreNonMatchGroup] = await Promise.all(
      [
        import('@tokengator/db/schema/asset'),
        adminSession.client.adminAssetGroup.create({
          address: 'address-100%',
          label: 'Revenue 100%',
          type: 'collection',
        }),
        adminSession.client.adminAssetGroup.create({
          address: 'address-1000',
          label: 'Revenue 1000',
          type: 'collection',
        }),
        adminSession.client.adminAssetGroup.create({
          address: 'team_1-address',
          label: 'Team_1 Group',
          type: 'mint',
        }),
        adminSession.client.adminAssetGroup.create({
          address: 'teama1-address',
          label: 'TeamA1 Group',
          type: 'mint',
        }),
      ],
    )
    const indexedAt = new Date()

    await database.insert(asset).values([
      {
        address: 'asset-100%',
        addressLower: 'asset-100%',
        amount: 1,
        assetGroupId: percentGroup.id,
        firstSeenAt: indexedAt,
        id: crypto.randomUUID(),
        indexedAssetId: `v2:${JSON.stringify([percentGroup.id, 'asset-100%', 'wallet_1', 'helius-collection-assets'])}`,
        indexedAt,
        lastSeenAt: indexedAt,
        owner: 'wallet_1',
        ownerLower: 'wallet_1',
        page: 1,
        resolverId: percentGroup.id,
        resolverKind: 'helius-collection-assets',
      },
      {
        address: 'asset-1000',
        addressLower: 'asset-1000',
        amount: 1,
        assetGroupId: percentGroup.id,
        firstSeenAt: indexedAt,
        id: crypto.randomUUID(),
        indexedAssetId: `v2:${JSON.stringify([percentGroup.id, 'asset-1000', 'walleta1', 'helius-collection-assets'])}`,
        indexedAt,
        lastSeenAt: indexedAt,
        owner: 'walleta1',
        ownerLower: 'walleta1',
        page: 1,
        resolverId: percentGroup.id,
        resolverKind: 'helius-collection-assets',
      },
    ])

    const groupsWithPercent = await adminSession.client.adminAssetGroup.list({
      search: '100%',
    })
    const groupsWithUnderscore = await adminSession.client.adminAssetGroup.list({
      search: 'Team_1',
    })
    const assetsWithPercent = await adminSession.client.adminAsset.list({
      address: '100%',
      assetGroupId: percentGroup.id,
    })
    const assetsWithUnderscore = await adminSession.client.adminAsset.list({
      assetGroupId: percentGroup.id,
      owner: 'wallet_1',
    })

    expect(groupsWithPercent.assetGroups).toContainEqual(
      expect.objectContaining({
        id: percentGroup.id,
        label: 'Revenue 100%',
      }),
    )
    expect(groupsWithPercent.assetGroups).not.toContainEqual(
      expect.objectContaining({
        id: percentNonMatchGroup.id,
      }),
    )
    expect(groupsWithUnderscore.assetGroups).toContainEqual(
      expect.objectContaining({
        id: underscoreGroup.id,
        label: 'Team_1 Group',
      }),
    )
    expect(groupsWithUnderscore.assetGroups).not.toContainEqual(
      expect.objectContaining({
        id: underscoreNonMatchGroup.id,
      }),
    )
    expect(assetsWithPercent.assets).toHaveLength(1)
    expect(assetsWithPercent.assets[0]).toMatchObject({
      address: 'asset-100%',
      owner: 'wallet_1',
    })
    expect(assetsWithUnderscore.assets).toHaveLength(1)
    expect(assetsWithUnderscore.assets[0]).toMatchObject({
      address: 'asset-100%',
      owner: 'wallet_1',
    })
  })

  test('non-admin access to admin routes is forbidden', async () => {
    await expectORPCError(bobSession.client.adminOrganization.list(), {
      code: 'FORBIDDEN',
      status: 403,
    })
    await expectORPCError(bobSession.client.adminAssetGroup.list(), {
      code: 'FORBIDDEN',
      status: 403,
    })
    await expectORPCError(
      bobSession.client.adminAsset.list({
        assetGroupId: 'missing-asset-group',
      }),
      {
        code: 'FORBIDDEN',
        status: 403,
      },
    )
  })

  test('expected NOT_FOUND and BAD_REQUEST responses remain intact', async () => {
    await expectORPCError(
      adminSession.client.adminOrganization.get({
        organizationId: 'missing-organization',
      }),
      {
        code: 'NOT_FOUND',
        status: 404,
      },
    )
    await expectORPCError(
      adminSession.client.adminOrganization.create({
        name: 'Invalid Owner Org',
        ownerUserId: 'missing-user',
        slug: 'invalid-owner-org',
      }),
      {
        code: 'BAD_REQUEST',
        message: 'Owner user not found.',
        status: 400,
      },
    )
    await expectORPCError(
      adminSession.client.adminAssetGroup.get({
        assetGroupId: 'missing-asset-group',
      }),
      {
        code: 'NOT_FOUND',
        status: 404,
      },
    )
    await expectORPCError(
      adminSession.client.adminAsset.list({
        assetGroupId: 'missing-asset-group',
      }),
      {
        code: 'NOT_FOUND',
        status: 404,
      },
    )
    await expectORPCError(
      adminSession.client.adminAsset.delete({
        id: 'missing-asset',
      }),
      {
        code: 'NOT_FOUND',
        status: 404,
      },
    )
  })
})
