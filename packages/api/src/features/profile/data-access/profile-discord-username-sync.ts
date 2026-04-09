import { and, asc, eq } from 'drizzle-orm'
import { auth, reconcileUserIdentities } from '@tokengator/auth'
import { getDiscordUsername } from '@tokengator/auth/lib/username'
import { db } from '@tokengator/db'
import { account } from '@tokengator/db/schema/auth'

export async function profileDiscordUsernameSync(input: {
  currentUsername: string | null
  requestHeaders: Headers
  userId: string
}) {
  if (input.currentUsername) {
    return {
      updated: false,
      username: input.currentUsername,
    }
  }

  const [discordAccount] = await db
    .select({
      accountId: account.accountId,
    })
    .from(account)
    .where(and(eq(account.providerId, 'discord'), eq(account.userId, input.userId)))
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
      headers: input.requestHeaders,
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
      headers: input.requestHeaders,
    })
    await reconcileUserIdentities({
      requestHeaders: input.requestHeaders,
      userId: input.userId,
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
