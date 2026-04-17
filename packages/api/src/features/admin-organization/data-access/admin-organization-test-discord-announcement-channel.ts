import { and, asc, desc, eq } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { account, identity } from '@tokengator/db/schema/auth'

import { sendCommunityDiscordAnnouncementTestMessage } from '../../../features/community-discord-announcement'

import type { AdminOrganizationTestDiscordAnnouncementChannelInput } from './admin-organization-test-discord-announcement-channel-input'
import { adminOrganizationRecordGet } from './admin-organization-record-get'

async function loadCanonicalDiscordAccountIdByUserId(userId: string) {
  const [identityRecord] = await db
    .select({
      providerId: identity.providerId,
    })
    .from(identity)
    .where(and(eq(identity.provider, 'discord'), eq(identity.userId, userId)))
    .orderBy(desc(identity.isPrimary), asc(identity.linkedAt), asc(identity.id))
    .limit(1)

  if (identityRecord) {
    return identityRecord.providerId
  }

  const [accountRecord] = await db
    .select({
      accountId: account.accountId,
    })
    .from(account)
    .where(and(eq(account.providerId, 'discord'), eq(account.userId, userId)))
    .orderBy(asc(account.createdAt), asc(account.id))
    .limit(1)

  return accountRecord?.accountId ?? null
}

export async function adminOrganizationTestDiscordAnnouncementChannel(
  input: AdminOrganizationTestDiscordAnnouncementChannelInput & {
    requestedByName: string
    requestedByUserId: string
  },
) {
  const existingOrganization = await adminOrganizationRecordGet(input.organizationId)

  if (!existingOrganization) {
    return {
      status: 'organization-not-found' as const,
    }
  }

  const requestedByDiscordAccountId = await loadCanonicalDiscordAccountIdByUserId(input.requestedByUserId)

  return sendCommunityDiscordAnnouncementTestMessage({
    ...input,
    organizationName: existingOrganization.name,
    requestedByDiscordAccountId,
  })
}
