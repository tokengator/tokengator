import { eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { user } from '@tokengator/db/schema/auth'

import { adminUserEntityColumns } from './admin-user.entity'

export async function adminUserRecordGet(userId: string) {
  const [userRecord] = await db.select(adminUserEntityColumns).from(user).where(eq(user.id, userId)).limit(1)

  return userRecord ?? null
}
