import type { DiscordProfile } from 'better-auth/social-providers'
import { betterAuth } from 'better-auth'
import { siws } from 'better-auth-solana'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createAuthMiddleware } from 'better-auth/api'
import { admin } from 'better-auth/plugins/admin'
import { organization } from 'better-auth/plugins/organization'
import { username } from 'better-auth/plugins/username'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@tokengator/db'
import * as schema from '@tokengator/db/schema/auth'
import { env } from '@tokengator/env/api'

import {
  getDiscordUsername,
  isValidUsername,
  MAX_USERNAME_LENGTH,
  MIN_USERNAME_LENGTH,
  normalizeUsername,
} from './lib/username'

type DesiredIdentity = Omit<typeof schema.identity.$inferInsert, 'id'>
type DiscordAccountInfo = {
  data?: Record<string, unknown>
  user?: Record<string, unknown>
}
type SyncDiscordUsernameResult = {
  updated: boolean
  username: string | null
}

function ellipsifySolanaWalletAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-6)}`
}

function getIdentityReferenceKey(args: { referenceId: string; referenceType: string }) {
  return `${args.referenceType}:${args.referenceId}`
}

async function hasDiscordAdminAccount(userId: string) {
  if (env.DISCORD_ADMIN_IDS.length === 0) {
    return false
  }

  const [accountRecord] = await db
    .select({
      id: schema.account.id,
    })
    .from(schema.account)
    .where(
      and(
        eq(schema.account.providerId, 'discord'),
        eq(schema.account.userId, userId),
        inArray(schema.account.accountId, env.DISCORD_ADMIN_IDS),
      ),
    )
    .limit(1)

  return accountRecord !== undefined
}

async function hasSolanaAdminWallet(userId: string) {
  if (env.SOLANA_ADMIN_ADDRESSES.length === 0) {
    return false
  }

  const [walletRecord] = await db
    .select({
      id: schema.solanaWallet.id,
    })
    .from(schema.solanaWallet)
    .where(
      and(eq(schema.solanaWallet.userId, userId), inArray(schema.solanaWallet.address, env.SOLANA_ADMIN_ADDRESSES)),
    )
    .limit(1)

  return walletRecord !== undefined
}

export async function hasLocalAuthProviderLink(args: { providerId: string; userId: string }) {
  const [accountRecord] = await db
    .select({
      id: schema.account.id,
    })
    .from(schema.account)
    .where(and(eq(schema.account.providerId, args.providerId), eq(schema.account.userId, args.userId)))
    .orderBy(asc(schema.account.accountId), asc(schema.account.id))
    .limit(1)

  return accountRecord !== undefined
}

async function syncAdminRole(userId: string) {
  const [userRecord] = await db
    .select({
      role: schema.user.role,
    })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1)

  if (!userRecord || userRecord.role === 'admin') {
    return
  }

  const [shouldPromoteFromDiscord, shouldPromoteFromSolana] = await Promise.all([
    hasDiscordAdminAccount(userId),
    hasSolanaAdminWallet(userId),
  ])

  if (!shouldPromoteFromDiscord && !shouldPromoteFromSolana) {
    return
  }

  await db.update(schema.user).set({ role: 'admin' }).where(eq(schema.user.id, userId))
}

function getBetterAuthDomain(url: string) {
  return new URL(url).host
}

function getCompatibilityEmailDomain(url: string) {
  return `discord.${new URL(url).hostname}`
}

function localIdentityProjectionPlugin() {
  return {
    hooks: {
      after: [
        {
          handler: createAuthMiddleware(async (ctx) => {
            const userId = ctx.context.session?.user.id

            if (!userId) {
              return
            }

            await reconcileLocalUserState({
              userId,
            })
          }),
          matcher: (context: { path?: string }) => context.path === '/siws/link',
        },
      ],
    },
    id: 'local-identity-projection',
  }
}

function mapDiscordProfileToUser(profile: DiscordProfile) {
  const username = getDiscordUsername(profile.username)
  let compatibilityEmail: string | undefined

  if ('email' in profile && typeof profile.email === 'string' && profile.email.trim()) {
    compatibilityEmail = profile.email.trim()
  } else if ('id' in profile && typeof profile.id === 'string') {
    compatibilityEmail = `${profile.id}@${getCompatibilityEmailDomain(env.API_URL)}`
  }

  return {
    ...(compatibilityEmail ? { email: compatibilityEmail } : {}),
    ...(username ? { username } : {}),
  }
}

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() || null
}

function normalizeOptionalString(value: string | null | undefined) {
  return value?.trim() || null
}

function getOptionalString(record: Record<string, unknown> | null | undefined, key: string) {
  const value = record?.[key]

  return typeof value === 'string' && value.trim() ? value.trim() : null
}

async function getDiscordAccountInfo(args: {
  accountId: string
  requestHeaders?: Headers
}): Promise<DiscordAccountInfo | null> {
  const { accountId, requestHeaders } = args

  if (!requestHeaders) {
    return null
  }

  try {
    return (await auth.api.accountInfo({
      headers: requestHeaders,
      query: {
        accountId,
      },
    })) as DiscordAccountInfo
  } catch {
    return null
  }
}

function serializeIdentityProfile(value: unknown) {
  if (!value) {
    return null
  }

  try {
    const serialized = JSON.stringify(value)

    return serialized === '{}' ? null : serialized
  } catch {
    return null
  }
}

async function createDesiredDiscordIdentities(args: {
  requestHeaders?: Headers
  userId: string
}): Promise<DesiredIdentity[]> {
  const { requestHeaders, userId } = args
  const now = new Date()
  const [discordAccounts, existingDiscordIdentities] = await Promise.all([
    db
      .select({
        accountCreatedAt: schema.account.createdAt,
        accountId: schema.account.accountId,
        accountRowId: schema.account.id,
        userEmail: schema.user.email,
        userImage: schema.user.image,
        userName: schema.user.name,
        userUsername: schema.user.username,
      })
      .from(schema.account)
      .innerJoin(schema.user, eq(schema.account.userId, schema.user.id))
      .where(and(eq(schema.account.providerId, 'discord'), eq(schema.account.userId, userId)))
      .orderBy(asc(schema.account.createdAt), asc(schema.account.id)),
    db
      .select({
        avatarUrl: schema.identity.avatarUrl,
        displayName: schema.identity.displayName,
        email: schema.identity.email,
        profile: schema.identity.profile,
        providerId: schema.identity.providerId,
        referenceId: schema.identity.referenceId,
        username: schema.identity.username,
      })
      .from(schema.identity)
      .where(and(eq(schema.identity.provider, 'discord'), eq(schema.identity.userId, userId)))
      .orderBy(desc(schema.identity.isPrimary), asc(schema.identity.linkedAt), asc(schema.identity.id)),
  ])
  const existingDiscordIdentityByProviderId = new Map<string, (typeof existingDiscordIdentities)[number]>()
  const existingDiscordIdentityByReferenceId = new Map<string, (typeof existingDiscordIdentities)[number]>()

  for (const existingDiscordIdentity of existingDiscordIdentities) {
    if (!existingDiscordIdentityByProviderId.has(existingDiscordIdentity.providerId)) {
      existingDiscordIdentityByProviderId.set(existingDiscordIdentity.providerId, existingDiscordIdentity)
    }

    if (!existingDiscordIdentityByReferenceId.has(existingDiscordIdentity.referenceId)) {
      existingDiscordIdentityByReferenceId.set(existingDiscordIdentity.referenceId, existingDiscordIdentity)
    }
  }

  return Promise.all(
    discordAccounts.map(async (discordAccount, index) => {
      const accountInfo = await getDiscordAccountInfo({
        accountId: discordAccount.accountId,
        requestHeaders,
      })
      const existingDiscordIdentity =
        existingDiscordIdentityByReferenceId.get(discordAccount.accountRowId) ??
        existingDiscordIdentityByProviderId.get(discordAccount.accountId) ??
        null
      const fallbackAvatarUrl = index === 0 ? discordAccount.userImage : null
      const fallbackDisplayName = index === 0 ? discordAccount.userName : null
      const fallbackEmail = index === 0 ? discordAccount.userEmail : null
      const fallbackUsername = index === 0 ? discordAccount.userUsername : null
      const username = getDiscordUsername(
        getOptionalString(accountInfo?.user, 'username') ??
          getOptionalString(accountInfo?.data, 'username') ??
          existingDiscordIdentity?.username ??
          fallbackUsername,
      )

      return {
        avatarUrl: normalizeOptionalString(
          getOptionalString(accountInfo?.user, 'image') ??
            getOptionalString(accountInfo?.data, 'image') ??
            existingDiscordIdentity?.avatarUrl ??
            fallbackAvatarUrl,
        ),
        displayName: normalizeOptionalString(
          getOptionalString(accountInfo?.user, 'name') ??
            getOptionalString(accountInfo?.data, 'name') ??
            existingDiscordIdentity?.displayName ??
            fallbackDisplayName,
        ),
        email: normalizeEmail(
          getOptionalString(accountInfo?.user, 'email') ??
            getOptionalString(accountInfo?.data, 'email') ??
            existingDiscordIdentity?.email ??
            fallbackEmail,
        ),
        isPrimary: index === 0,
        lastSyncedAt: now,
        linkedAt: discordAccount.accountCreatedAt,
        profile: serializeIdentityProfile(accountInfo) ?? existingDiscordIdentity?.profile ?? null,
        provider: 'discord' as const,
        providerId: discordAccount.accountId,
        referenceId: discordAccount.accountRowId,
        referenceType: 'account' as const,
        userId,
        username,
      } satisfies DesiredIdentity
    }),
  )
}

async function createDesiredSolanaIdentities(userId: string): Promise<DesiredIdentity[]> {
  const now = new Date()
  const solanaWallets = await db
    .select({
      address: schema.solanaWallet.address,
      isPrimary: schema.solanaWallet.isPrimary,
      name: schema.solanaWallet.name,
      walletCreatedAt: schema.solanaWallet.createdAt,
      walletRowId: schema.solanaWallet.id,
    })
    .from(schema.solanaWallet)
    .where(eq(schema.solanaWallet.userId, userId))
    .orderBy(asc(schema.solanaWallet.address), asc(schema.solanaWallet.id))

  return solanaWallets.map((solanaWallet) => {
    const displayName = normalizeOptionalString(solanaWallet.name) ?? ellipsifySolanaWalletAddress(solanaWallet.address)

    return {
      avatarUrl: null,
      displayName,
      email: null,
      isPrimary: solanaWallet.isPrimary,
      lastSyncedAt: now,
      linkedAt: solanaWallet.walletCreatedAt,
      profile: null,
      provider: 'solana' as const,
      providerId: solanaWallet.address,
      referenceId: solanaWallet.walletRowId,
      referenceType: 'solana_wallet' as const,
      userId,
      username: null,
    } satisfies DesiredIdentity
  })
}

export async function reconcileLocalUserIdentities(args: { requestHeaders?: Headers; userId: string }) {
  const { requestHeaders, userId } = args
  const supportedProviders = ['discord', 'solana'] as const
  const [discordIdentities, solanaIdentities] = await Promise.all([
    createDesiredDiscordIdentities({
      requestHeaders,
      userId,
    }),
    createDesiredSolanaIdentities(userId),
  ])
  const primaryAvatarUrl = discordIdentities[0]?.avatarUrl ?? null
  const desiredIdentities = [...discordIdentities, ...solanaIdentities].sort((left, right) => {
    const providerComparison = left.provider.localeCompare(right.provider)

    if (providerComparison !== 0) {
      return providerComparison
    }

    return left.providerId.localeCompare(right.providerId)
  })

  await db.transaction(async (transaction) => {
    const existingIdentityRows = await transaction
      .select({
        id: schema.identity.id,
        referenceId: schema.identity.referenceId,
        referenceType: schema.identity.referenceType,
      })
      .from(schema.identity)
      .where(and(eq(schema.identity.userId, userId), inArray(schema.identity.provider, supportedProviders)))
    const existingIdentityIdByReference = new Map(
      existingIdentityRows.map((identityRow) => [
        getIdentityReferenceKey({
          referenceId: identityRow.referenceId,
          referenceType: identityRow.referenceType,
        }),
        identityRow.id,
      ]),
    )
    const desiredReferenceKeys = new Set(
      desiredIdentities.map((identityRow) =>
        getIdentityReferenceKey({
          referenceId: identityRow.referenceId,
          referenceType: identityRow.referenceType,
        }),
      ),
    )
    const staleIdentityIds = existingIdentityRows
      .filter(
        (identityRow) =>
          !desiredReferenceKeys.has(
            getIdentityReferenceKey({
              referenceId: identityRow.referenceId,
              referenceType: identityRow.referenceType,
            }),
          ),
      )
      .map((identityRow) => identityRow.id)

    if (staleIdentityIds.length > 0) {
      await transaction.delete(schema.identity).where(inArray(schema.identity.id, staleIdentityIds))
    }

    for (const desiredIdentity of desiredIdentities) {
      const identityId =
        existingIdentityIdByReference.get(
          getIdentityReferenceKey({
            referenceId: desiredIdentity.referenceId,
            referenceType: desiredIdentity.referenceType,
          }),
        ) ?? crypto.randomUUID()

      await transaction
        .insert(schema.identity)
        .values({
          ...desiredIdentity,
          id: identityId,
        })
        .onConflictDoUpdate({
          set: {
            avatarUrl: desiredIdentity.avatarUrl,
            displayName: desiredIdentity.displayName,
            email: desiredIdentity.email,
            isPrimary: desiredIdentity.isPrimary,
            lastSyncedAt: desiredIdentity.lastSyncedAt,
            linkedAt: desiredIdentity.linkedAt,
            profile: desiredIdentity.profile,
            provider: desiredIdentity.provider,
            providerId: desiredIdentity.providerId,
            updatedAt: new Date(),
            userId: desiredIdentity.userId,
            username: desiredIdentity.username,
          },
          target: [schema.identity.referenceType, schema.identity.referenceId],
        })
    }
  })

  if (primaryAvatarUrl) {
    await db
      .update(schema.user)
      .set({
        image: primaryAvatarUrl,
      })
      .where(eq(schema.user.id, userId))
  }
}

export async function reconcileLocalUserState(args: { requestHeaders?: Headers; userId: string }) {
  await reconcileLocalUserIdentities(args)
  await syncAdminRole(args.userId)
}

export async function syncDiscordUsername(args: {
  currentUsername: string | null | undefined
  requestHeaders: Headers
  userId: string
}): Promise<SyncDiscordUsernameResult> {
  if (args.currentUsername) {
    return {
      updated: false,
      username: args.currentUsername,
    }
  }

  const [discordAccount] = await db
    .select({
      accountId: schema.account.accountId,
    })
    .from(schema.account)
    .where(and(eq(schema.account.providerId, 'discord'), eq(schema.account.userId, args.userId)))
    .orderBy(asc(schema.account.createdAt), asc(schema.account.id))
    .limit(1)

  if (!discordAccount) {
    return {
      updated: false,
      username: null,
    }
  }

  try {
    const accountInfo = await getDiscordAccountInfo({
      accountId: discordAccount.accountId,
      requestHeaders: args.requestHeaders,
    })
    const username = getDiscordUsername(
      getOptionalString(accountInfo?.user, 'username') ?? getOptionalString(accountInfo?.data, 'username') ?? null,
    )

    if (!username) {
      return {
        updated: false,
        username: null,
      }
    }

    await auth.api.updateUser({
      body: {
        username,
      },
      headers: args.requestHeaders,
    })

    return {
      updated: true,
      username,
    }
  } catch {
    return {
      updated: false,
      username: null,
    }
  }
}

function getDefaultCookieAttributes() {
  const isSecureOrigin = new URL(env.API_URL).protocol === 'https:'

  return {
    httpOnly: true,
    sameSite: isSecureOrigin ? ('none' as const) : ('lax' as const),
    secure: isSecureOrigin,
  }
}

const siwsUri = env.WEB_URL ?? env.API_URL
export const auth = betterAuth({
  account: {
    accountLinking: {
      allowDifferentEmails: true,
    },
  },
  advanced: {
    defaultCookieAttributes: getDefaultCookieAttributes(),
  },
  baseURL: env.API_URL,
  database: drizzleAdapter(db, {
    provider: 'sqlite',

    schema: schema,
  }),
  databaseHooks: {
    account: {
      create: {
        after: async (account) => {
          await reconcileLocalUserState({
            userId: account.userId,
          })
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          await reconcileLocalUserState({
            userId: session.userId,
          })

          return {
            data: session,
          }
        },
      },
    },
    user: {
      update: {
        after: async (user) => {
          await reconcileLocalUserState({
            userId: user.id,
          })
        },
      },
    },
  },
  emailAndPassword: {
    enabled: false,
  },
  plugins: [
    admin(),
    localIdentityProjectionPlugin(),
    organization({
      allowUserToCreateOrganization: false,
      teams: {
        enabled: true,
      },
    }),
    siws({
      anonymous: true,
      domain: getBetterAuthDomain(siwsUri),
      uri: siwsUri,
    }),
    username({
      maxUsernameLength: MAX_USERNAME_LENGTH,
      minUsernameLength: MIN_USERNAME_LENGTH,
      usernameNormalization: normalizeUsername,
      usernameValidator: isValidUsername,
      validationOrder: {
        username: 'post-normalization',
      },
    }),
  ],
  secret: env.BETTER_AUTH_SECRET,
  socialProviders: {
    discord: {
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
      mapProfileToUser: mapDiscordProfileToUser,
      overrideUserInfoOnSignIn: true,
    },
  },
  trustedOrigins: env.CORS_ORIGINS,
})
