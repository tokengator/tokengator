import type { DiscordProfile } from 'better-auth/social-providers'
import { betterAuth } from 'better-auth'
import { siws } from 'better-auth-solana'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins/admin'
import { organization } from 'better-auth/plugins/organization'
import { username } from 'better-auth/plugins/username'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@tokengator/db'
import * as schema from '@tokengator/db/schema/auth'
import { env } from '@tokengator/env/api'

import { isAdminEmail } from './lib/admin-email'
import {
  getDiscordUsername,
  isValidUsername,
  MAX_USERNAME_LENGTH,
  MIN_USERNAME_LENGTH,
  normalizeUsername,
} from './lib/username'

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

async function syncAdminRole(userId: string) {
  const [userRecord] = await db
    .select({
      email: schema.user.email,
      role: schema.user.role,
    })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1)

  if (!userRecord || userRecord.role === 'admin') {
    return
  }

  const shouldPromoteFromEmail = isAdminEmail(userRecord.email, env.BETTER_AUTH_ADMIN_EMAILS)
  const [shouldPromoteFromDiscord, shouldPromoteFromSolana] = await Promise.all([
    hasDiscordAdminAccount(userId),
    hasSolanaAdminWallet(userId),
  ])

  if (!shouldPromoteFromDiscord && !shouldPromoteFromEmail && !shouldPromoteFromSolana) {
    return
  }

  await db.update(schema.user).set({ role: 'admin' }).where(eq(schema.user.id, userId))
}

function getBetterAuthDomain(url: string) {
  return new URL(url).host
}

function mapDiscordProfileToUser(profile: DiscordProfile) {
  const username = getDiscordUsername(profile.username)

  return username ? { username } : {}
}

function getDefaultCookieAttributes() {
  const isSecureOrigin = new URL(env.BETTER_AUTH_URL).protocol === 'https:'

  return {
    httpOnly: true,
    sameSite: isSecureOrigin ? ('none' as const) : ('lax' as const),
    secure: isSecureOrigin,
  }
}

const siwsUri = env.WEB_URL ?? env.BETTER_AUTH_URL
export const auth = betterAuth({
  account: {
    accountLinking: {
      allowDifferentEmails: true,
    },
  },
  advanced: {
    defaultCookieAttributes: getDefaultCookieAttributes(),
  },
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: 'sqlite',

    schema: schema,
  }),
  databaseHooks: {
    account: {
      create: {
        after: async (account) => {
          await syncAdminRole(account.userId)
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          await syncAdminRole(session.userId)

          return {
            data: session,
          }
        },
      },
    },
    user: {
      create: {
        before: async (user) => {
          return {
            data: {
              ...user,
              role: user.email && isAdminEmail(user.email, env.BETTER_AUTH_ADMIN_EMAILS) ? 'admin' : undefined,
            },
          }
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  emailVerification: {
    afterEmailVerification: async (user) => {
      if (!isAdminEmail(user.email, env.BETTER_AUTH_ADMIN_EMAILS)) {
        return
      }

      await syncAdminRole(user.id)
    },
  },
  plugins: [
    admin(),
    organization({
      allowUserToCreateOrganization: false,
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
