import { asc, desc, eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { identity } from '@tokengator/db/schema/auth'

import { toProfileIdentityEntity } from './profile.entity'

export async function profileIdentitiesList(input: { userId: string }) {
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
      referenceId: identity.referenceId,
      referenceType: identity.referenceType,
      username: identity.username,
    })
    .from(identity)
    .where(eq(identity.userId, input.userId))
    .orderBy(asc(identity.provider), desc(identity.isPrimary), asc(identity.linkedAt), asc(identity.providerId))

  return {
    identities: identityRecords.map(toProfileIdentityEntity),
  }
}
