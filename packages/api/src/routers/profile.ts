import { ORPCError } from '@orpc/server'
import { and, asc, desc, eq } from 'drizzle-orm'
import z from 'zod'
import { auth, reconcileUserIdentities } from '@tokengator/auth'
import { getDiscordUsername } from '@tokengator/auth/lib/username'
import { db } from '@tokengator/db'
import { account, identity, solanaWallet } from '@tokengator/db/schema/auth'
import { formatLogError, getAppLogger } from '@tokengator/logger'

import { protectedProcedure } from '../index'

const logger = getAppLogger('api', 'profile-router')

function ellipsifySolanaWalletAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-6)}`
}

function normalizeSolanaWalletName(name: string | null) {
  const trimmedName = name?.trim()

  return trimmedName ? trimmedName : null
}

async function reconcileUserIdentitiesBestEffort(args: { requestHeaders?: Headers; userId: string }) {
  const { requestHeaders, userId } = args

  try {
    await reconcileUserIdentities({
      requestHeaders,
      userId,
    })
  } catch (error) {
    logger.error('[profile-router] userId={userId} failed to refresh identity projection error={error}', {
      error: formatLogError(error),
      userId,
    })
  }
}

function toProfileSolanaWallet(walletRecord: { address: string; id: string; isPrimary: boolean; name: string | null }) {
  const name = normalizeSolanaWalletName(walletRecord.name)

  return {
    address: walletRecord.address,
    displayName: name ?? ellipsifySolanaWalletAddress(walletRecord.address),
    id: walletRecord.id,
    isPrimary: walletRecord.isPrimary,
    name,
  }
}

export const profileRouter = {
  deleteSolanaWallet: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
      }),
    )
    .handler(async ({ context, input }) => {
      const [walletRecord] = await db
        .select({
          id: solanaWallet.id,
          isPrimary: solanaWallet.isPrimary,
        })
        .from(solanaWallet)
        .where(and(eq(solanaWallet.id, input.id), eq(solanaWallet.userId, context.session.user.id)))
        .limit(1)

      if (!walletRecord) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Solana wallet not found.',
        })
      }

      if (walletRecord.isPrimary) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Primary Solana wallet cannot be deleted.',
        })
      }

      await db.delete(solanaWallet).where(eq(solanaWallet.id, walletRecord.id))
      await reconcileUserIdentitiesBestEffort({
        requestHeaders: context.requestHeaders,
        userId: context.session.user.id,
      })

      return {
        solanaWalletId: walletRecord.id,
      }
    }),
  listIdentities: protectedProcedure.handler(async ({ context }) => {
    await reconcileUserIdentities({
      requestHeaders: context.requestHeaders,
      userId: context.session.user.id,
    })

    const identityRecords = await db
      .select({
        avatarUrl: identity.avatarUrl,
        displayName: identity.displayName,
        email: identity.email,
        id: identity.id,
        isPrimary: identity.isPrimary,
        linkedAt: identity.linkedAt,
        provider: identity.provider,
        providerId: identity.providerId,
        username: identity.username,
      })
      .from(identity)
      .where(eq(identity.userId, context.session.user.id))
      .orderBy(asc(identity.provider), desc(identity.isPrimary), asc(identity.linkedAt), asc(identity.providerId))

    return {
      identities: identityRecords.map((identity) => ({
        avatarUrl: identity.avatarUrl,
        displayName: identity.displayName,
        email: identity.email,
        id: identity.id,
        isPrimary: identity.isPrimary,
        linkedAt: identity.linkedAt.getTime(),
        provider: identity.provider,
        providerId: identity.providerId,
        username: identity.username,
      })),
    }
  }),
  listSolanaWallets: protectedProcedure.handler(async ({ context }) => {
    const walletRecords = await db
      .select({
        address: solanaWallet.address,
        id: solanaWallet.id,
        isPrimary: solanaWallet.isPrimary,
        name: solanaWallet.name,
      })
      .from(solanaWallet)
      .where(eq(solanaWallet.userId, context.session.user.id))
      .orderBy(asc(solanaWallet.address))

    return {
      solanaWallets: walletRecords.map(toProfileSolanaWallet),
    }
  }),
  setPrimarySolanaWallet: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
      }),
    )
    .handler(async ({ context, input }) => {
      const [walletRecord] = await db
        .select({
          address: solanaWallet.address,
          id: solanaWallet.id,
          isPrimary: solanaWallet.isPrimary,
          name: solanaWallet.name,
          userId: solanaWallet.userId,
        })
        .from(solanaWallet)
        .where(and(eq(solanaWallet.id, input.id), eq(solanaWallet.userId, context.session.user.id)))
        .limit(1)

      if (!walletRecord) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Solana wallet not found.',
        })
      }

      if (!walletRecord.isPrimary) {
        await db.transaction(async (transaction) => {
          await transaction
            .update(solanaWallet)
            .set({
              isPrimary: false,
            })
            .where(eq(solanaWallet.userId, walletRecord.userId))

          await transaction
            .update(solanaWallet)
            .set({
              isPrimary: true,
            })
            .where(eq(solanaWallet.id, walletRecord.id))
        })
      }

      await reconcileUserIdentitiesBestEffort({
        requestHeaders: context.requestHeaders,
        userId: context.session.user.id,
      })

      return {
        solanaWallet: toProfileSolanaWallet({
          address: walletRecord.address,
          id: walletRecord.id,
          isPrimary: true,
          name: walletRecord.name,
        }),
      }
    }),
  syncDiscordUsername: protectedProcedure.handler(async ({ context }) => {
    const currentUsername = context.session.user.username ?? null

    if (currentUsername) {
      return {
        updated: false,
        username: currentUsername,
      }
    }

    const [discordAccount] = await db
      .select({
        accountId: account.accountId,
      })
      .from(account)
      .where(and(eq(account.providerId, 'discord'), eq(account.userId, context.session.user.id)))
      .orderBy(asc(account.createdAt), asc(account.id))
      .limit(1)

    if (!discordAccount) {
      return {
        updated: false,
        username: null,
      }
    }

    try {
      const accountInfo = (await auth.api.accountInfo({
        headers: context.requestHeaders,
        query: {
          accountId: discordAccount.accountId,
        },
      })) as {
        data?: {
          username?: string | null
        }
        user?: {
          username?: string | null
        }
      }
      const username = getDiscordUsername(accountInfo.user?.username ?? accountInfo.data?.username ?? null)

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
        headers: context.requestHeaders,
      })
      await reconcileUserIdentities({
        requestHeaders: context.requestHeaders,
        userId: context.session.user.id,
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
  }),
  updateSolanaWallet: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string(),
      }),
    )
    .handler(async ({ context, input }) => {
      const [walletRecord] = await db
        .select({
          address: solanaWallet.address,
          id: solanaWallet.id,
          isPrimary: solanaWallet.isPrimary,
          name: solanaWallet.name,
        })
        .from(solanaWallet)
        .where(and(eq(solanaWallet.id, input.id), eq(solanaWallet.userId, context.session.user.id)))
        .limit(1)

      if (!walletRecord) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Solana wallet not found.',
        })
      }

      const nextName = normalizeSolanaWalletName(input.name)
      const [updatedWallet] = await db
        .update(solanaWallet)
        .set({
          name: nextName,
        })
        .where(eq(solanaWallet.id, walletRecord.id))
        .returning({
          address: solanaWallet.address,
          id: solanaWallet.id,
          isPrimary: solanaWallet.isPrimary,
          name: solanaWallet.name,
        })

      await reconcileUserIdentitiesBestEffort({
        requestHeaders: context.requestHeaders,
        userId: context.session.user.id,
      })

      return {
        solanaWallet: toProfileSolanaWallet(updatedWallet ?? { ...walletRecord, name: nextName }),
      }
    }),
}
