import { ORPCError } from '@orpc/server'
import { and, eq, ne } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { organization } from '@tokengator/db/schema/auth'
import { communityDiscordConnection } from '@tokengator/db/schema/community-role'
import { createDiscordBotInviteUrl } from '@tokengator/discord/create-discord-bot-invite-url'
import { env } from '@tokengator/env/api'

import {
  inspectDiscordGuildConnection,
  type DiscordGuildConnectionDiagnostics,
  type InspectDiscordGuildConnectionResult,
} from '@tokengator/discord/inspect-discord-guild-connection'

export const DISCORD_GUILD_ID_PATTERN = /^\d{17,20}$/

export type AdminCommunityDiscordConnection = {
  diagnostics: DiscordGuildConnectionDiagnostics | null
  guildId: string
  guildName: string | null
  inviteUrl: string
  lastCheckedAt: Date | null
  roleSyncEnabled: boolean
  status: 'connected' | 'needs_attention'
}

export interface CommunityDiscordConnectionMutationOptions {
  checkGuildConnection?: typeof inspectDiscordGuildConnection
}

type StoredCommunityDiscordConnectionRecord = {
  diagnostics: string | null
  guildId: string
  guildName: string | null
  lastCheckedAt: Date | null
  organizationId: string
  roleSyncEnabled: boolean
  status: 'connected' | 'needs_attention'
}

function createDiscordCapabilityCheckFallback(input: {
  error: unknown
  guildId: string
}): InspectDiscordGuildConnectionResult {
  const lastCheckedAt = new Date()

  return {
    diagnostics: {
      checks: ['guild_fetch_failed'],
      commands: {
        errorMessage: input.error instanceof Error ? input.error.message : 'Discord request failed.',
        registered: false,
      },
      guild: {
        id: input.guildId,
        name: null,
      },
      permissions: {
        administrator: false,
        manageRoles: false,
      },
    },
    guildName: null,
    lastCheckedAt,
    status: 'needs_attention',
  }
}

function parseStoredDiscordDiagnostics(value: string | null) {
  if (!value) {
    return null
  }

  try {
    const parsedValue = JSON.parse(value)

    return typeof parsedValue === 'object' && parsedValue !== null
      ? (parsedValue as DiscordGuildConnectionDiagnostics)
      : null
  } catch {
    return null
  }
}

async function getStoredCommunityDiscordConnectionByOrganizationId(organizationId: string) {
  const [record] = await db
    .select({
      diagnostics: communityDiscordConnection.diagnostics,
      guildId: communityDiscordConnection.guildId,
      guildName: communityDiscordConnection.guildName,
      lastCheckedAt: communityDiscordConnection.lastCheckedAt,
      organizationId: communityDiscordConnection.organizationId,
      roleSyncEnabled: communityDiscordConnection.roleSyncEnabled,
      status: communityDiscordConnection.status,
    })
    .from(communityDiscordConnection)
    .where(eq(communityDiscordConnection.organizationId, organizationId))
    .limit(1)

  return (record ?? null) as StoredCommunityDiscordConnectionRecord | null
}

async function persistDiscordConnectionCheck(input: {
  guildId: string
  options?: CommunityDiscordConnectionMutationOptions
  organizationId: string
  roleSyncEnabled: boolean
}) {
  const checkGuildConnection = input.options?.checkGuildConnection ?? inspectDiscordGuildConnection
  const result = await checkGuildConnection(
    {
      env,
    },
    {
      guildId: input.guildId,
    },
  ).catch((error: unknown) =>
    createDiscordCapabilityCheckFallback({
      error,
      guildId: input.guildId,
    }),
  )
  const diagnostics = JSON.stringify(result.diagnostics)

  await db
    .update(communityDiscordConnection)
    .set({
      diagnostics,
      guildName: result.guildName,
      lastCheckedAt: result.lastCheckedAt,
      status: result.status,
      updatedAt: new Date(),
    })
    .where(eq(communityDiscordConnection.organizationId, input.organizationId))

  return toAdminCommunityDiscordConnection({
    diagnostics,
    guildId: input.guildId,
    guildName: result.guildName,
    lastCheckedAt: result.lastCheckedAt,
    organizationId: input.organizationId,
    roleSyncEnabled: input.roleSyncEnabled,
    status: result.status,
  })
}

function toAdminCommunityDiscordConnection(
  record: StoredCommunityDiscordConnectionRecord,
): AdminCommunityDiscordConnection {
  return {
    diagnostics: parseStoredDiscordDiagnostics(record.diagnostics),
    guildId: record.guildId,
    guildName: record.guildName,
    inviteUrl: createDiscordBotInviteUrl(
      {
        env,
      },
      {
        guildId: record.guildId,
      },
    ),
    lastCheckedAt: record.lastCheckedAt,
    roleSyncEnabled: record.roleSyncEnabled,
    status: record.status,
  }
}

async function validateUniqueDiscordGuildConnection(input: { guildId: string; organizationId: string }) {
  const [conflictingConnection] = await db
    .select({
      organizationName: organization.name,
      organizationSlug: organization.slug,
    })
    .from(communityDiscordConnection)
    .innerJoin(organization, eq(communityDiscordConnection.organizationId, organization.id))
    .where(
      and(
        eq(communityDiscordConnection.guildId, input.guildId),
        ne(communityDiscordConnection.organizationId, input.organizationId),
      ),
    )
    .limit(1)

  if (conflictingConnection) {
    throw new ORPCError('BAD_REQUEST', {
      message: `Discord server is already connected to ${conflictingConnection.organizationName} (${conflictingConnection.organizationSlug}).`,
    })
  }
}

export async function deleteCommunityDiscordConnectionByOrganizationId(organizationId: string) {
  await db.delete(communityDiscordConnection).where(eq(communityDiscordConnection.organizationId, organizationId))
}

export async function getCommunityDiscordConnectionByOrganizationId(organizationId: string) {
  const record = await getStoredCommunityDiscordConnectionByOrganizationId(organizationId)

  return record ? toAdminCommunityDiscordConnection(record) : null
}

export async function refreshCommunityDiscordConnection(
  organizationId: string,
  options?: CommunityDiscordConnectionMutationOptions,
) {
  const existingConnection = await getStoredCommunityDiscordConnectionByOrganizationId(organizationId)

  if (!existingConnection) {
    return null
  }

  return await persistDiscordConnectionCheck({
    guildId: existingConnection.guildId,
    options,
    organizationId,
    roleSyncEnabled: existingConnection.roleSyncEnabled,
  })
}

export async function setCommunityDiscordRoleSyncEnabled(input: { enabled: boolean; organizationId: string }) {
  const existingConnection = await getStoredCommunityDiscordConnectionByOrganizationId(input.organizationId)

  if (!existingConnection) {
    return null
  }

  await db
    .update(communityDiscordConnection)
    .set({
      roleSyncEnabled: input.enabled,
      updatedAt: new Date(),
    })
    .where(eq(communityDiscordConnection.organizationId, input.organizationId))

  return toAdminCommunityDiscordConnection({
    ...existingConnection,
    roleSyncEnabled: input.enabled,
  })
}

export async function upsertCommunityDiscordConnection(
  input: {
    guildId: string
    organizationId: string
  },
  options?: CommunityDiscordConnectionMutationOptions,
) {
  await validateUniqueDiscordGuildConnection(input)

  const existingConnection = await getStoredCommunityDiscordConnectionByOrganizationId(input.organizationId)
  const now = new Date()

  if (existingConnection) {
    await db
      .update(communityDiscordConnection)
      .set({
        diagnostics: null,
        guildId: input.guildId,
        guildName: null,
        lastCheckedAt: null,
        status: 'needs_attention',
        updatedAt: now,
      })
      .where(eq(communityDiscordConnection.organizationId, input.organizationId))
  } else {
    await db.insert(communityDiscordConnection).values({
      createdAt: now,
      diagnostics: null,
      guildId: input.guildId,
      guildName: null,
      lastCheckedAt: null,
      organizationId: input.organizationId,
      roleSyncEnabled: true,
      status: 'needs_attention',
      updatedAt: now,
    })
  }

  return await persistDiscordConnectionCheck({
    guildId: input.guildId,
    options,
    organizationId: input.organizationId,
    roleSyncEnabled: existingConnection?.roleSyncEnabled ?? true,
  })
}
