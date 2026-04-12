import { eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { user } from '@tokengator/db/schema/auth'

type ProfileUserByUsernameRecord = {
  id: string
  image: string | null
  name: string
  private: boolean
  username: string
}

export async function profileUserByUsernameGet(username: string): Promise<ProfileUserByUsernameRecord | null> {
  const [userRecord] = await db
    .select({
      id: user.id,
      image: user.image,
      name: user.name,
      private: user.private,
      username: user.username,
    })
    .from(user)
    .where(eq(user.username, username))
    .limit(1)

  if (!userRecord?.username) {
    return null
  }

  return {
    ...userRecord,
    username: userRecord.username,
  }
}

export async function profileVisibleUserByUsernameGet(args: {
  username: string
  viewerUserId: string
}): Promise<ProfileUserByUsernameRecord | null> {
  const userRecord = await profileUserByUsernameGet(args.username)

  if (!userRecord) {
    return null
  }

  if (userRecord.private && userRecord.id !== args.viewerUserId) {
    return null
  }

  return userRecord
}
