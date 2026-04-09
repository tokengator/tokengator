import { asc, desc, eq } from 'drizzle-orm'
import { reconcileUserIdentities } from '@tokengator/auth'
import { db } from '@tokengator/db'
import { identity } from '@tokengator/db/schema/auth'

import { toProfileIdentityEntity } from './profile.entity'

export async function profileIdentitiesList(input: { requestHeaders?: Headers; userId: string }) {
  await reconcileUserIdentities({
    requestHeaders: input.requestHeaders,
    userId: input.userId,
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
    .where(eq(identity.userId, input.userId))
    .orderBy(asc(identity.provider), desc(identity.isPrimary), asc(identity.linkedAt), asc(identity.providerId))

  return {
    identities: identityRecords.map(toProfileIdentityEntity),
  }
}
