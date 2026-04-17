import { and, asc, eq } from 'drizzle-orm'
import { db, type Database } from '@tokengator/db'
import { communityDiscordAnnouncement } from '@tokengator/db/schema/community-role'
import {
  DiscordChannelMessageError,
  inspectDiscordGuildAnnouncementChannels,
  sendDiscordChannelMessage,
  type DiscordGuildAnnouncementChannelCheck,
  type DiscordGuildAnnouncementChannelInspectionCheck,
  type DiscordGuildAnnouncementChannelInspectionDiagnostics,
} from '@tokengator/discord'
import { env } from '@tokengator/env/api'
import { formatLogError, getAppLogger } from '@tokengator/logger'

import { getCommunityDiscordConnectionByOrganizationId } from '../../../features/community-discord-connection'

const logger = getAppLogger('api', 'community-discord-announcement')

export const communityDiscordAnnouncementTypes = ['role_updates'] as const
export const DISCORD_CHANNEL_ID_PATTERN = /^\d{17,20}$/

export type DiscordAnnouncementType = (typeof communityDiscordAnnouncementTypes)[number]

export type CommunityDiscordAnnouncementCatalogConfigCheck =
  | DiscordGuildAnnouncementChannelCheck
  | DiscordGuildAnnouncementChannelInspectionCheck
  | 'channel_not_found'

export type CommunityDiscordAnnouncementCatalogConfigStatus = 'needs_attention' | 'not_configured' | 'ready'

export type CommunityDiscordAnnouncementCatalogChannel = {
  id: string
  name: string
  type: 'announcement' | 'text'
}

export type CommunityDiscordAnnouncementCatalogConfig = {
  channelId: string | null
  channelName: string | null
  checks: CommunityDiscordAnnouncementCatalogConfigCheck[]
  description: string
  enabled: boolean
  label: string
  status: CommunityDiscordAnnouncementCatalogConfigStatus
  type: DiscordAnnouncementType
}

export type CommunityDiscordAnnouncementCatalog = {
  channels: CommunityDiscordAnnouncementCatalogChannel[]
  configs: CommunityDiscordAnnouncementCatalogConfig[]
  connection: {
    diagnostics: DiscordGuildAnnouncementChannelInspectionDiagnostics
    guildId: string
    guildName: string | null
    lastCheckedAt: Date
    status: 'connected' | 'needs_attention'
  } | null
}

export type CommunityDiscordAnnouncementConfigRecord = {
  channelId: string
  channelName: string | null
  enabled: boolean
  type: DiscordAnnouncementType
}

export type CommunityDiscordRoleUpdatesAnnouncementPayload = {
  changes: Array<{
    action: 'grant' | 'revoke'
    communityRoleName: string
    discordRoleName: string | null
  }>
  discordAccountId: string
  userName: string
  username: string | null
}

export type CommunityDiscordAnnouncementPayloadByType = {
  role_updates: CommunityDiscordRoleUpdatesAnnouncementPayload
}

const communityDiscordAnnouncementDefinitions = [
  {
    description: 'Post a message when Discord reconcile grants or revokes roles for a user.',
    label: 'Role Updates',
    type: 'role_updates',
  },
] as const satisfies ReadonlyArray<{
  description: string
  label: string
  type: DiscordAnnouncementType
}>

const communityDiscordAnnouncementMessageBuilders: {
  [K in DiscordAnnouncementType]: (payload: CommunityDiscordAnnouncementPayloadByType[K]) => string | null
} = {
  role_updates: buildRoleUpdatesAnnouncementMessage,
}

function buildCommunityDiscordAnnouncementTestMessageBody(input: {
  definition: (typeof communityDiscordAnnouncementDefinitions)[number]
  organizationName: string
  requestedByDiscordAccountId: string | null
  requestedByName: string
}) {
  const requestedByLabel = input.requestedByDiscordAccountId
    ? `<@${input.requestedByDiscordAccountId}>`
    : input.requestedByName

  return {
    embeds: [
      {
        color: 0x5865f2,
        description: [
          `**Announcement:** ${input.definition.label}`,
          `**Organization:** ${input.organizationName}`,
          `**Triggered by:** ${requestedByLabel}`,
          '',
          `If you received this message, TokenGator can post ${input.definition.label.toLowerCase()} announcements in this channel.`,
        ].join('\n'),
        title: '🧪 TokenGator Announcement Test',
      },
    ],
  }
}

function buildRoleUpdatesAnnouncementMessage(payload: CommunityDiscordRoleUpdatesAnnouncementPayload) {
  const grantedRoles = payload.changes
    .filter((change) => change.action === 'grant')
    .map((change) => change.discordRoleName ?? change.communityRoleName)
  const revokedRoles = payload.changes
    .filter((change) => change.action === 'revoke')
    .map((change) => change.discordRoleName ?? change.communityRoleName)

  if (grantedRoles.length === 0 && revokedRoles.length === 0) {
    return null
  }

  const lines = [
    `Role updates applied for ${payload.userName}${payload.username ? ` (@${payload.username})` : ''}.`,
    `Discord account: ${payload.discordAccountId}`,
  ]

  if (grantedRoles.length > 0) {
    lines.push('', 'Granted:')

    for (const grantedRole of grantedRoles.sort((left, right) => left.localeCompare(right))) {
      lines.push(`- ${grantedRole}`)
    }
  }

  if (revokedRoles.length > 0) {
    lines.push('', 'Revoked:')

    for (const revokedRole of revokedRoles.sort((left, right) => left.localeCompare(right))) {
      lines.push(`- ${revokedRole}`)
    }
  }

  return lines.join('\n')
}

async function getStoredCommunityDiscordAnnouncementConfigsByOrganizationId(organizationId: string) {
  const rows = await db
    .select({
      announcementType: communityDiscordAnnouncement.announcementType,
      channelId: communityDiscordAnnouncement.channelId,
      channelName: communityDiscordAnnouncement.channelName,
      enabled: communityDiscordAnnouncement.enabled,
    })
    .from(communityDiscordAnnouncement)
    .where(eq(communityDiscordAnnouncement.organizationId, organizationId))
    .orderBy(asc(communityDiscordAnnouncement.announcementType))

  return rows.map((row) => ({
    channelId: row.channelId,
    channelName: row.channelName,
    enabled: row.enabled,
    type: row.announcementType as DiscordAnnouncementType,
  }))
}

async function getStoredCommunityDiscordAnnouncementConfigByType(input: {
  database?: Pick<Database, 'select'>
  organizationId: string
  type: DiscordAnnouncementType
}) {
  const database = input.database ?? db
  const [record] = await database
    .select({
      channelId: communityDiscordAnnouncement.channelId,
      channelName: communityDiscordAnnouncement.channelName,
      enabled: communityDiscordAnnouncement.enabled,
    })
    .from(communityDiscordAnnouncement)
    .where(
      and(
        eq(communityDiscordAnnouncement.organizationId, input.organizationId),
        eq(communityDiscordAnnouncement.announcementType, input.type),
      ),
    )
    .limit(1)

  return record
    ? {
        channelId: record.channelId,
        channelName: record.channelName,
        enabled: record.enabled,
        type: input.type,
      }
    : null
}

function getCommunityDiscordAnnouncementDefinition(type: DiscordAnnouncementType) {
  return communityDiscordAnnouncementDefinitions.find((definition) => definition.type === type) ?? null
}

async function inspectCommunityDiscordAnnouncementChannelSelection(input: {
  channelId: string
  organizationId: string
}) {
  const connection = await getCommunityDiscordConnectionByOrganizationId(input.organizationId)

  if (!connection) {
    return {
      status: 'discord-connection-not-found' as const,
    }
  }

  const inspection = await inspectDiscordGuildAnnouncementChannels(
    {
      env,
    },
    {
      guildId: connection.guildId,
    },
  )
  const selectedChannel = inspection.channels.find((channel) => channel.id === input.channelId) ?? null

  if (!selectedChannel) {
    return {
      status: 'discord-channel-not-found' as const,
    }
  }

  if (!selectedChannel.canPost) {
    return {
      status: 'discord-channel-not-postable' as const,
    }
  }

  return {
    channel: selectedChannel,
    status: 'success' as const,
  }
}

function toCommunityDiscordAnnouncementCatalogConfig(input: {
  definition: (typeof communityDiscordAnnouncementDefinitions)[number]
  inspection: Awaited<ReturnType<typeof inspectDiscordGuildAnnouncementChannels>> | null
  storedConfig: CommunityDiscordAnnouncementConfigRecord | null
}): CommunityDiscordAnnouncementCatalogConfig {
  if (!input.storedConfig) {
    return {
      channelId: null,
      channelName: null,
      checks: [],
      description: input.definition.description,
      enabled: false,
      label: input.definition.label,
      status: 'not_configured',
      type: input.definition.type,
    }
  }

  if (!input.inspection) {
    return {
      channelId: input.storedConfig.channelId,
      channelName: input.storedConfig.channelName,
      checks: ['channel_not_found'],
      description: input.definition.description,
      enabled: input.storedConfig.enabled,
      label: input.definition.label,
      status: 'needs_attention',
      type: input.definition.type,
    }
  }

  const storedConfig = input.storedConfig
  const matchedChannel = input.inspection.channels.find((channel) => channel.id === storedConfig.channelId)
  const checks =
    matchedChannel == null
      ? input.inspection.diagnostics.checks.length > 0
        ? input.inspection.diagnostics.checks
        : (['channel_not_found'] as CommunityDiscordAnnouncementCatalogConfigCheck[])
      : matchedChannel.canPost
        ? []
        : matchedChannel.checks

  return {
    channelId: storedConfig.channelId,
    channelName: matchedChannel?.name ?? storedConfig.channelName,
    checks,
    description: input.definition.description,
    enabled: storedConfig.enabled,
    label: input.definition.label,
    status: checks.length === 0 ? 'ready' : 'needs_attention',
    type: input.definition.type,
  }
}

export async function getCommunityDiscordAnnouncementCatalog(
  organizationId: string,
): Promise<CommunityDiscordAnnouncementCatalog> {
  const connection = await getCommunityDiscordConnectionByOrganizationId(organizationId)
  const storedConfigs = await getStoredCommunityDiscordAnnouncementConfigsByOrganizationId(organizationId)
  const storedConfigsByType = new Map(storedConfigs.map((config) => [config.type, config] as const))

  if (!connection) {
    return {
      channels: [],
      configs: communityDiscordAnnouncementDefinitions.map((definition) =>
        toCommunityDiscordAnnouncementCatalogConfig({
          definition,
          inspection: null,
          storedConfig: storedConfigsByType.get(definition.type) ?? null,
        }),
      ),
      connection: null,
    }
  }

  const inspection = await inspectDiscordGuildAnnouncementChannels(
    {
      env,
    },
    {
      guildId: connection.guildId,
    },
  )

  return {
    channels: inspection.channels
      .filter((channel) => channel.canPost)
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
      })),
    configs: communityDiscordAnnouncementDefinitions.map((definition) =>
      toCommunityDiscordAnnouncementCatalogConfig({
        definition,
        inspection,
        storedConfig: storedConfigsByType.get(definition.type) ?? null,
      }),
    ),
    connection: {
      diagnostics: inspection.diagnostics,
      guildId: connection.guildId,
      guildName: inspection.guildName ?? connection.guildName,
      lastCheckedAt: inspection.lastCheckedAt,
      status: inspection.status,
    },
  }
}

export async function publishCommunityDiscordAnnouncement<TType extends DiscordAnnouncementType>(input: {
  database?: Pick<Database, 'select'>
  organizationId: string
  payload: CommunityDiscordAnnouncementPayloadByType[TType]
  type: TType
}) {
  try {
    const config = await getStoredCommunityDiscordAnnouncementConfigByType({
      database: input.database,
      organizationId: input.organizationId,
      type: input.type,
    })

    if (!config?.enabled) {
      return
    }

    const messageBuilder = communityDiscordAnnouncementMessageBuilders[input.type]
    const message = messageBuilder(input.payload)

    if (!message) {
      return
    }

    await sendDiscordChannelMessage(
      {
        env,
      },
      {
        body: {
          allowed_mentions: {
            parse: [],
          },
          content: message,
        },
        channelId: config.channelId,
      },
    )
  } catch (error) {
    logger.error('Failed to publish Discord announcement: {error}', {
      error: formatLogError(error),
    })
  }
}

export async function setCommunityDiscordAnnouncementEnabled(input: {
  enabled: boolean
  organizationId: string
  type: DiscordAnnouncementType
}) {
  const existingConfig = await getStoredCommunityDiscordAnnouncementConfigByType(input)

  if (!existingConfig) {
    return null
  }

  await db
    .update(communityDiscordAnnouncement)
    .set({
      enabled: input.enabled,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(communityDiscordAnnouncement.organizationId, input.organizationId),
        eq(communityDiscordAnnouncement.announcementType, input.type),
      ),
    )

  return {
    ...existingConfig,
    enabled: input.enabled,
  } satisfies CommunityDiscordAnnouncementConfigRecord
}

export async function sendCommunityDiscordAnnouncementTestMessage(input: {
  channelId: string
  organizationId: string
  organizationName: string
  requestedByDiscordAccountId: string | null
  requestedByName: string
  type: DiscordAnnouncementType
}) {
  const definition = getCommunityDiscordAnnouncementDefinition(input.type)

  if (!definition) {
    return {
      status: 'discord-message-send-failed' as const,
    }
  }

  const selection = await inspectCommunityDiscordAnnouncementChannelSelection(input)

  if (selection.status !== 'success') {
    return selection
  }

  try {
    await sendDiscordChannelMessage(
      {
        env,
      },
      {
        body: buildCommunityDiscordAnnouncementTestMessageBody({
          definition,
          organizationName: input.organizationName,
          requestedByDiscordAccountId: input.requestedByDiscordAccountId,
          requestedByName: input.requestedByName,
        }),
        channelId: selection.channel.id,
      },
    )
  } catch (error) {
    if (error instanceof DiscordChannelMessageError) {
      if (error.code === 'channel_not_found') {
        return {
          status: 'discord-channel-not-found' as const,
        }
      }

      if (error.code === 'forbidden') {
        return {
          status: 'discord-channel-not-postable' as const,
        }
      }

      if (error.code === 'rate_limited') {
        return {
          status: 'discord-message-send-rate-limited' as const,
        }
      }
    }

    logger.error('Failed to send Discord announcement test message: {error}', {
      error: formatLogError(error),
    })

    return {
      status: 'discord-message-send-failed' as const,
    }
  }

  return {
    channelId: selection.channel.id,
    channelName: selection.channel.name,
    status: 'success' as const,
  }
}

export async function upsertCommunityDiscordAnnouncementConfig(input: {
  channelId: string
  organizationId: string
  type: DiscordAnnouncementType
}) {
  const selection = await inspectCommunityDiscordAnnouncementChannelSelection(input)

  if (selection.status !== 'success') {
    return selection
  }

  const existingConfig = await getStoredCommunityDiscordAnnouncementConfigByType(input)
  const now = new Date()

  if (existingConfig) {
    await db
      .update(communityDiscordAnnouncement)
      .set({
        channelId: selection.channel.id,
        channelName: selection.channel.name,
        updatedAt: now,
      })
      .where(
        and(
          eq(communityDiscordAnnouncement.organizationId, input.organizationId),
          eq(communityDiscordAnnouncement.announcementType, input.type),
        ),
      )
  } else {
    await db.insert(communityDiscordAnnouncement).values({
      announcementType: input.type,
      channelId: selection.channel.id,
      channelName: selection.channel.name,
      createdAt: now,
      enabled: true,
      organizationId: input.organizationId,
      updatedAt: now,
    })
  }

  return {
    config: {
      channelId: selection.channel.id,
      channelName: selection.channel.name,
      enabled: existingConfig?.enabled ?? true,
      type: input.type,
    } satisfies CommunityDiscordAnnouncementConfigRecord,
    status: 'success' as const,
  }
}
