import { eq } from 'drizzle-orm'
import { auth } from '@tokengator/auth'
import { db } from '@tokengator/db'
import { session, user } from '@tokengator/db/schema/auth'

import type { AdminUserUpdateInput } from './admin-user-update-input'
import { adminUserGet } from './admin-user-get'
import { adminUserRecordGet } from './admin-user-record-get'

function normalizeOptionalString(value: string | null | undefined) {
  const nextValue = value?.trim()

  return nextValue ? nextValue : null
}

function normalizeUpdateData(input: AdminUserUpdateInput['data']) {
  const nextData: {
    email?: string
    name?: string
    role?: 'admin' | 'user'
    username?: string | null
  } = {}

  if (input.email !== undefined) {
    nextData.email = input.email.trim().toLowerCase()
  }

  if (input.name !== undefined) {
    const nextName = input.name.trim()

    if (nextName.length > 0) {
      nextData.name = nextName
    }
  }

  if (input.role !== undefined) {
    nextData.role = input.role
  }

  if (input.username !== undefined) {
    nextData.username = normalizeOptionalString(input.username)
  }

  return nextData
}

function resolveBanExpires(input: {
  banExpires: AdminUserUpdateInput['data']['banExpires']
  banned: boolean
  existingBanExpires: Date | null
}) {
  if (!input.banned) {
    return null
  }

  if (input.banExpires === undefined) {
    return input.existingBanExpires
  }

  if (input.banExpires === null) {
    return null
  }

  const nextBanExpires = new Date(input.banExpires)

  return Number.isNaN(nextBanExpires.getTime()) ? null : nextBanExpires
}

export async function adminUserUpdate(input: {
  data: AdminUserUpdateInput['data']
  requestHeaders: Headers
  userId: string
}) {
  const existingUser = await adminUserRecordGet(input.userId)
  const nextDeveloperMode = input.data.developerMode
  const nextImage = input.data.image === undefined ? undefined : normalizeOptionalString(input.data.image)
  const nextPrivate = input.data.private

  if (!existingUser) {
    return {
      status: 'user-not-found' as const,
    }
  }

  const nextUserData = normalizeUpdateData(input.data)

  if (Object.keys(nextUserData).length > 0) {
    await auth.api.adminUpdateUser({
      body: {
        data: nextUserData,
        userId: input.userId,
      },
      headers: input.requestHeaders,
    })
  }

  if (nextDeveloperMode !== undefined || nextImage !== undefined || nextPrivate !== undefined) {
    // Better Auth's admin update endpoint does not persist image and does not manage app-specific flags.
    await db
      .update(user)
      .set({
        developerMode: nextDeveloperMode,
        image: nextImage,
        private: nextPrivate,
      })
      .where(eq(user.id, input.userId))
  }

  const nextBanned = input.data.banned ?? existingUser.banned

  if (input.data.banExpires !== undefined || input.data.banReason !== undefined || input.data.banned !== undefined) {
    await db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({
          banExpires: resolveBanExpires({
            banExpires: input.data.banExpires,
            banned: nextBanned,
            existingBanExpires: existingUser.banExpires,
          }),
          banned: nextBanned,
          banReason: nextBanned
            ? input.data.banReason === undefined
              ? existingUser.banReason
              : normalizeOptionalString(input.data.banReason)
            : null,
        })
        .where(eq(user.id, input.userId))

      if (nextBanned) {
        await tx.delete(session).where(eq(session.userId, input.userId))
      }
    })
  }

  const updatedUser = await adminUserGet(input.userId)

  if (!updatedUser) {
    return {
      status: 'user-updated-but-not-loaded' as const,
    }
  }

  return {
    status: 'success' as const,
    user: updatedUser,
  }
}
