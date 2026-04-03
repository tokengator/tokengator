import { ORPCError } from '@orpc/server'
import { and, asc, eq, inArray, ne } from 'drizzle-orm'
import z from 'zod'
import { db } from '@tokengator/db'
import { assetGroup } from '@tokengator/db/schema/asset'
import { organization, team, teamMember } from '@tokengator/db/schema/auth'
import { communityRole, communityRoleCondition } from '@tokengator/db/schema/community-role'
import { DiscordGuildMemberLookupError } from '@tokengator/discord'
import {
  inspectDiscordGuildRoles,
  type DiscordGuildRoleInspectionCheck,
  type DiscordGuildRoleInspectionDiagnostics,
  type DiscordGuildRoleRecord,
} from '@tokengator/discord/inspect-discord-guild-roles'
import { env } from '@tokengator/env/api'

import { adminProcedure } from '../index'
import { getCommunityDiscordConnectionByOrganizationId } from '../lib/admin-community-discord-connection'
import {
  applyCommunityRoleDiscordSync,
  applyCommunityRoleSync,
  listCommunityRoleRecords,
  previewCommunityRoleDiscordSync,
  previewCommunityRoleSync,
  removeCommunityRoleById,
  upsertCommunityRoleConditions,
} from '../lib/admin-community-role-sync'

const positiveIntegerSchema = z.string().regex(/^[1-9]\d*$/, 'Amount must be a positive integer.')

const communityRoleConditionInputSchema = z.object({
  assetGroupId: z.string().min(1),
  maximumAmount: positiveIntegerSchema
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  minimumAmount: positiveIntegerSchema,
})

const communityRoleInputSchema = z.object({
  conditions: z.array(communityRoleConditionInputSchema).min(1),
  enabled: z.boolean(),
  matchMode: z.enum(['all', 'any']),
  name: z.string().trim().min(1),
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must use lowercase letters, numbers, and hyphens only.'),
})

const blockingDiscordGuildRoleChecks = new Set<DiscordGuildRoleInspectionCheck>([
  'bot_identity_lookup_failed',
  'bot_not_in_guild',
  'bot_token_missing',
  'guild_fetch_failed',
  'guild_not_found',
  'guild_roles_fetch_failed',
])

const discordGuildRoleInspectionCheckMessages: Record<DiscordGuildRoleInspectionCheck, string> = {
  bot_identity_lookup_failed: 'TokenGator could not identify the Discord bot account.',
  bot_not_in_guild: 'The Discord bot must join this server before roles can be mapped.',
  bot_token_missing: 'The Discord bot token is not configured for the API environment.',
  guild_fetch_failed: 'TokenGator could not load the Discord server details.',
  guild_not_found: 'The connected Discord server could not be found.',
  guild_roles_fetch_failed: 'TokenGator could not load the Discord role list for this server.',
  manage_roles_missing: 'The Discord bot is missing the Manage Roles permission.',
}

type CommunityDiscordGuildRolesResult = {
  connection: {
    diagnostics: DiscordGuildRoleInspectionDiagnostics
    guildId: string
    guildName: string | null
    lastCheckedAt: Date
    status: 'connected' | 'needs_attention'
  } | null
  guildRoles: DiscordGuildRoleRecord[]
}

type CommunityRoleDiscordMappingStatus = {
  checks: string[]
  status: 'needs_attention' | 'not_mapped' | 'ready'
}

function rethrowDiscordRoleSyncError(error: unknown): never {
  if (!(error instanceof DiscordGuildMemberLookupError)) {
    throw error
  }

  if (error.code === 'forbidden') {
    throw new ORPCError('BAD_REQUEST', {
      message: `TokenGator could not load Discord member state for this server: ${error.message}.`,
    })
  }

  if (error.code === 'rate_limited') {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Discord member lookups were rate limited. Try again shortly.',
    })
  }

  throw new ORPCError('INTERNAL_SERVER_ERROR', {
    message: `TokenGator could not load Discord member state for this server: ${error.message}.`,
  })
}

function createCommunityRoleDiscordMappingStatus(input: {
  connection: CommunityDiscordGuildRolesResult['connection']
  discordRoleId: string | null
  guildRole: DiscordGuildRoleRecord | null
}): CommunityRoleDiscordMappingStatus {
  if (!input.discordRoleId) {
    return {
      checks: [],
      status: 'not_mapped',
    }
  }

  if (!input.connection) {
    return {
      checks: ['discord_connection_missing'],
      status: 'needs_attention',
    }
  }

  if (!input.guildRole) {
    return {
      checks: ['discord_role_not_found'],
      status: 'needs_attention',
    }
  }

  const checks = [
    ...new Set(
      [...input.connection.diagnostics.checks, ...input.guildRole.checks].sort((left, right) =>
        left.localeCompare(right),
      ),
    ),
  ]

  return {
    checks,
    status: input.guildRole.assignable && checks.length === 0 ? 'ready' : 'needs_attention',
  }
}

function hasBlockingDiscordGuildRoleChecks(checks: DiscordGuildRoleInspectionCheck[]) {
  return checks.some((check) => blockingDiscordGuildRoleChecks.has(check))
}

async function ensureUniqueDiscordRoleMapping(input: {
  communityRoleId: string
  discordRoleId: string
  organizationId: string
}) {
  const [existingRole] = await db
    .select({
      id: communityRole.id,
      name: communityRole.name,
    })
    .from(communityRole)
    .where(
      and(
        eq(communityRole.discordRoleId, input.discordRoleId),
        ne(communityRole.id, input.communityRoleId),
        eq(communityRole.organizationId, input.organizationId),
      ),
    )
    .limit(1)

  if (existingRole) {
    throw new ORPCError('BAD_REQUEST', {
      message: `Discord role is already mapped to ${existingRole.name}.`,
    })
  }
}

async function getCommunityDiscordGuildRoles(organizationId: string): Promise<CommunityDiscordGuildRolesResult> {
  const connection = await getCommunityDiscordConnectionByOrganizationId(organizationId)

  if (!connection) {
    return {
      connection: null,
      guildRoles: [],
    }
  }

  const inspection = await inspectDiscordGuildRoles(
    {
      env,
    },
    {
      guildId: connection.guildId,
    },
  )

  return {
    connection: {
      diagnostics: inspection.diagnostics,
      guildId: connection.guildId,
      guildName: inspection.guildName ?? connection.guildName,
      lastCheckedAt: inspection.lastCheckedAt,
      status: inspection.status,
    },
    guildRoles: inspection.roles,
  }
}

async function ensureOrganizationExists(organizationId: string) {
  const [existingOrganization] = await db
    .select({
      id: organization.id,
    })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1)

  return existingOrganization ?? null
}

async function ensureCommunityRoleExists(communityRoleId: string) {
  const [existingRole] = await db
    .select({
      id: communityRole.id,
      organizationId: communityRole.organizationId,
      teamId: communityRole.teamId,
    })
    .from(communityRole)
    .where(eq(communityRole.id, communityRoleId))
    .limit(1)

  return existingRole ?? null
}

async function ensureUniqueSlug(input: { communityRoleId?: string; organizationId: string; slug: string }) {
  const [existingRole] = await db
    .select({
      id: communityRole.id,
    })
    .from(communityRole)
    .where(and(eq(communityRole.organizationId, input.organizationId), eq(communityRole.slug, input.slug)))
    .limit(1)

  if (existingRole && existingRole.id !== input.communityRoleId) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Community role slug is already taken.',
    })
  }
}

async function validateConditions(
  conditions: Array<{
    assetGroupId: string
    maximumAmount: string | null
    minimumAmount: string
  }>,
) {
  const uniqueAssetGroupIds = [...new Set(conditions.map((condition) => condition.assetGroupId))]

  if (uniqueAssetGroupIds.length !== conditions.length) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Each asset group can only appear once per community role.',
    })
  }

  const assetGroups = await db
    .select({
      id: assetGroup.id,
    })
    .from(assetGroup)
    .where(inArray(assetGroup.id, uniqueAssetGroupIds))

  if (assetGroups.length !== uniqueAssetGroupIds.length) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'One or more asset groups could not be found.',
    })
  }

  for (const condition of conditions) {
    if (condition.maximumAmount !== null && BigInt(condition.maximumAmount) < BigInt(condition.minimumAmount)) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Maximum amount must be greater than or equal to minimum amount.',
      })
    }
  }
}

async function getCommunityRoleRecordById(communityRoleId: string) {
  const [roleRow] = await db
    .select({
      createdAt: communityRole.createdAt,
      discordRoleId: communityRole.discordRoleId,
      enabled: communityRole.enabled,
      id: communityRole.id,
      matchMode: communityRole.matchMode,
      name: communityRole.name,
      organizationId: communityRole.organizationId,
      slug: communityRole.slug,
      teamId: communityRole.teamId,
      teamName: team.name,
      updatedAt: communityRole.updatedAt,
    })
    .from(communityRole)
    .innerJoin(team, eq(communityRole.teamId, team.id))
    .where(eq(communityRole.id, communityRoleId))
    .limit(1)

  if (!roleRow) {
    return null
  }

  const [conditionRows, teamMembershipRows] = await Promise.all([
    db
      .select({
        assetGroupAddress: assetGroup.address,
        assetGroupEnabled: assetGroup.enabled,
        assetGroupId: communityRoleCondition.assetGroupId,
        assetGroupLabel: assetGroup.label,
        assetGroupType: assetGroup.type,
        id: communityRoleCondition.id,
        maximumAmount: communityRoleCondition.maximumAmount,
        minimumAmount: communityRoleCondition.minimumAmount,
      })
      .from(communityRoleCondition)
      .innerJoin(assetGroup, eq(communityRoleCondition.assetGroupId, assetGroup.id))
      .where(eq(communityRoleCondition.communityRoleId, communityRoleId))
      .orderBy(asc(assetGroup.label), asc(assetGroup.type), asc(assetGroup.address), asc(communityRoleCondition.id)),
    db
      .select({
        teamId: teamMember.teamId,
      })
      .from(teamMember)
      .where(eq(teamMember.teamId, roleRow.teamId))
      .orderBy(asc(teamMember.teamId)),
  ])

  return {
    conditions: conditionRows.map((condition) => ({
      assetGroupAddress: condition.assetGroupAddress,
      assetGroupEnabled: condition.assetGroupEnabled,
      assetGroupId: condition.assetGroupId,
      assetGroupLabel: condition.assetGroupLabel,
      assetGroupType: condition.assetGroupType,
      id: condition.id,
      maximumAmount: condition.maximumAmount,
      minimumAmount: condition.minimumAmount,
    })),
    createdAt: roleRow.createdAt,
    discordRoleId: roleRow.discordRoleId,
    enabled: roleRow.enabled,
    id: roleRow.id,
    matchMode: roleRow.matchMode,
    name: roleRow.name,
    organizationId: roleRow.organizationId,
    slug: roleRow.slug,
    teamId: roleRow.teamId,
    teamMemberCount: teamMembershipRows.length,
    teamName: roleRow.teamName,
    updatedAt: roleRow.updatedAt,
  }
}

export const adminCommunityRoleRouter = {
  applyDiscordRoleSync: adminProcedure
    .input(
      z.object({
        organizationId: z.string().min(1),
      }),
    )
    .handler(async ({ input }) => {
      const existingOrganization = await ensureOrganizationExists(input.organizationId)

      if (!existingOrganization) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Organization not found.',
        })
      }

      const existingConnection = await getCommunityDiscordConnectionByOrganizationId(input.organizationId)

      if (!existingConnection) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Connect a Discord server for this community before syncing Discord roles.',
        })
      }

      try {
        return await applyCommunityRoleDiscordSync(input.organizationId)
      } catch (error) {
        rethrowDiscordRoleSyncError(error)
      }
    }),

  applySync: adminProcedure
    .input(
      z.object({
        organizationId: z.string().min(1),
      }),
    )
    .handler(async ({ input }) => {
      const result = await applyCommunityRoleSync(input.organizationId)

      if (!result) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Organization not found.',
        })
      }

      return result
    }),

  create: adminProcedure
    .input(
      z.object({
        data: communityRoleInputSchema,
        organizationId: z.string().min(1),
      }),
    )
    .handler(async ({ input }) => {
      const existingOrganization = await ensureOrganizationExists(input.organizationId)

      if (!existingOrganization) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Organization not found.',
        })
      }

      await Promise.all([
        ensureUniqueSlug({
          organizationId: input.organizationId,
          slug: input.data.slug,
        }),
        validateConditions(input.data.conditions),
      ])

      const now = new Date()
      const roleId = crypto.randomUUID()
      const teamId = crypto.randomUUID()

      await db.transaction(async (transaction) => {
        await transaction.insert(team).values({
          createdAt: now,
          id: teamId,
          name: input.data.name,
          organizationId: input.organizationId,
          updatedAt: now,
        })
        await transaction.insert(communityRole).values({
          createdAt: now,
          enabled: input.data.enabled,
          id: roleId,
          matchMode: input.data.matchMode,
          name: input.data.name,
          organizationId: input.organizationId,
          slug: input.data.slug,
          teamId,
          updatedAt: now,
        })
        await upsertCommunityRoleConditions({
          communityRoleId: roleId,
          conditions: input.data.conditions,
          database: transaction,
        })
      })

      const createdRole = await getCommunityRoleRecordById(roleId)

      if (!createdRole) {
        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          message: 'Community role was created but could not be loaded.',
        })
      }

      return createdRole
    }),

  delete: adminProcedure
    .input(
      z.object({
        communityRoleId: z.string().min(1),
      }),
    )
    .handler(async ({ input }) => {
      const deletedRole = await removeCommunityRoleById(input.communityRoleId)

      if (!deletedRole) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Community role not found.',
        })
      }

      return {
        communityRoleId: deletedRole.id,
        organizationId: deletedRole.organizationId,
      }
    }),

  list: adminProcedure
    .input(
      z.object({
        organizationId: z.string().min(1),
      }),
    )
    .handler(async ({ input }) => {
      const existingOrganization = await ensureOrganizationExists(input.organizationId)

      if (!existingOrganization) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Organization not found.',
        })
      }

      return {
        communityRoles: await listCommunityRoleRecords(input.organizationId),
      }
    }),

  listDiscordGuildRoles: adminProcedure
    .input(
      z.object({
        organizationId: z.string().min(1),
      }),
    )
    .handler(async ({ input }) => {
      const existingOrganization = await ensureOrganizationExists(input.organizationId)

      if (!existingOrganization) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Organization not found.',
        })
      }

      return await getCommunityDiscordGuildRoles(input.organizationId)
    }),

  previewDiscordRoleSync: adminProcedure
    .input(
      z.object({
        organizationId: z.string().min(1),
      }),
    )
    .handler(async ({ input }) => {
      const existingOrganization = await ensureOrganizationExists(input.organizationId)

      if (!existingOrganization) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Organization not found.',
        })
      }

      const existingConnection = await getCommunityDiscordConnectionByOrganizationId(input.organizationId)

      if (!existingConnection) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Connect a Discord server for this community before syncing Discord roles.',
        })
      }

      try {
        return await previewCommunityRoleDiscordSync(input.organizationId)
      } catch (error) {
        rethrowDiscordRoleSyncError(error)
      }
    }),

  previewSync: adminProcedure
    .input(
      z.object({
        organizationId: z.string().min(1),
      }),
    )
    .handler(async ({ input }) => {
      const result = await previewCommunityRoleSync(input.organizationId)

      if (!result) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Organization not found.',
        })
      }

      return result
    }),

  setDiscordRoleMapping: adminProcedure
    .input(
      z.object({
        communityRoleId: z.string().min(1),
        discordRoleId: z.string().trim().min(1).nullable(),
      }),
    )
    .handler(async ({ input }) => {
      const existingRole = await ensureCommunityRoleExists(input.communityRoleId)

      if (!existingRole) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Community role not found.',
        })
      }

      if (input.discordRoleId === null) {
        await db
          .update(communityRole)
          .set({
            discordRoleId: null,
            updatedAt: new Date(),
          })
          .where(eq(communityRole.id, input.communityRoleId))

        const updatedRole = await getCommunityRoleRecordById(input.communityRoleId)

        if (!updatedRole) {
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: 'Community role was updated but could not be loaded.',
          })
        }

        return {
          communityRole: updatedRole,
          mapping: createCommunityRoleDiscordMappingStatus({
            connection: null,
            discordRoleId: null,
            guildRole: null,
          }),
        }
      }

      await ensureUniqueDiscordRoleMapping({
        communityRoleId: input.communityRoleId,
        discordRoleId: input.discordRoleId,
        organizationId: existingRole.organizationId,
      })

      const guildRolesResult = await getCommunityDiscordGuildRoles(existingRole.organizationId)

      if (!guildRolesResult.connection) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Connect a Discord server for this community before mapping roles.',
        })
      }

      const blockingCheck = hasBlockingDiscordGuildRoleChecks(guildRolesResult.connection.diagnostics.checks)
        ? guildRolesResult.connection.diagnostics.checks.find((check) => blockingDiscordGuildRoleChecks.has(check))
        : null

      if (blockingCheck) {
        throw new ORPCError('BAD_REQUEST', {
          message: discordGuildRoleInspectionCheckMessages[blockingCheck],
        })
      }

      const selectedGuildRole =
        guildRolesResult.guildRoles.find((guildRole) => guildRole.id === input.discordRoleId) ?? null

      if (!selectedGuildRole) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Selected Discord role was not found in the connected server.',
        })
      }

      if (selectedGuildRole.isDefault) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'The @everyone Discord role cannot be mapped.',
        })
      }

      if (selectedGuildRole.managed) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Managed Discord roles cannot be mapped.',
        })
      }

      await db
        .update(communityRole)
        .set({
          discordRoleId: input.discordRoleId,
          updatedAt: new Date(),
        })
        .where(eq(communityRole.id, input.communityRoleId))

      const updatedRole = await getCommunityRoleRecordById(input.communityRoleId)

      if (!updatedRole) {
        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          message: 'Community role was updated but could not be loaded.',
        })
      }

      return {
        communityRole: updatedRole,
        mapping: createCommunityRoleDiscordMappingStatus({
          connection: guildRolesResult.connection,
          discordRoleId: input.discordRoleId,
          guildRole: selectedGuildRole,
        }),
      }
    }),

  update: adminProcedure
    .input(
      z.object({
        communityRoleId: z.string().min(1),
        data: communityRoleInputSchema,
      }),
    )
    .handler(async ({ input }) => {
      const existingRole = await ensureCommunityRoleExists(input.communityRoleId)

      if (!existingRole) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Community role not found.',
        })
      }

      await Promise.all([
        ensureUniqueSlug({
          communityRoleId: input.communityRoleId,
          organizationId: existingRole.organizationId,
          slug: input.data.slug,
        }),
        validateConditions(input.data.conditions),
      ])

      await db.transaction(async (transaction) => {
        await transaction
          .update(team)
          .set({
            name: input.data.name,
            updatedAt: new Date(),
          })
          .where(eq(team.id, existingRole.teamId))
        await transaction
          .update(communityRole)
          .set({
            enabled: input.data.enabled,
            matchMode: input.data.matchMode,
            name: input.data.name,
            slug: input.data.slug,
            updatedAt: new Date(),
          })
          .where(eq(communityRole.id, input.communityRoleId))
        await upsertCommunityRoleConditions({
          communityRoleId: input.communityRoleId,
          conditions: input.data.conditions,
          database: transaction,
        })
      })

      const updatedRole = await getCommunityRoleRecordById(input.communityRoleId)

      if (!updatedRole) {
        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          message: 'Community role was updated but could not be loaded.',
        })
      }

      return updatedRole
    }),
}
