import { eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { user } from '@tokengator/db/schema/auth'

import { toProfileSettingsEntity } from './profile.entity'

export async function profileSettingsGet(userId: string) {
  const [userRecord] = await db
    .select({
      developerMode: user.developerMode,
      private: user.private,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  return {
    settings: toProfileSettingsEntity({
      developerMode: userRecord?.developerMode ?? false,
      private: userRecord?.private ?? false,
    }),
  }
}
