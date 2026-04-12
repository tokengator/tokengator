import { eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { user } from '@tokengator/db/schema/auth'

import type { ProfileSettingsUpdateInput } from './profile-settings-update-input'
import { toProfileSettingsEntity } from './profile.entity'

export async function profileSettingsUpdate(input: { settings: ProfileSettingsUpdateInput; userId: string }) {
  const [updatedUser] = await db
    .update(user)
    .set({
      developerMode: input.settings.developerMode,
      private: input.settings.private,
    })
    .where(eq(user.id, input.userId))
    .returning({
      developerMode: user.developerMode,
      private: user.private,
    })

  if (!updatedUser) {
    throw new Error('User not found while updating profile settings.')
  }

  return {
    settings: toProfileSettingsEntity({
      developerMode: updatedUser.developerMode,
      private: updatedUser.private,
    }),
  }
}
