import { and, eq, ne } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { communityRole } from '@tokengator/db/schema/community-role'

import {
  adminCommunityRoleBlockingDiscordGuildRoleChecks,
  adminCommunityRoleCreateDiscordMappingStatus,
} from '../util/admin-community-role-discord-mapping-status'

import type { AdminCommunityRoleSetDiscordRoleMappingInput } from './admin-community-role-set-discord-role-mapping-input'
import { adminCommunityRoleDiscordGuildRolesGet } from './admin-community-role-discord-guild-roles-get'
import { adminCommunityRoleEntityGet } from './admin-community-role-entity-get'
import { adminCommunityRoleRecordGet } from './admin-community-role-record-get'

export async function adminCommunityRoleSetDiscordRoleMapping(input: AdminCommunityRoleSetDiscordRoleMappingInput) {
  const existingCommunityRole = await adminCommunityRoleRecordGet(input.communityRoleId)

  if (!existingCommunityRole) {
    return {
      status: 'community-role-not-found' as const,
    }
  }

  if (input.discordRoleId === null) {
    await db
      .update(communityRole)
      .set({
        discordRoleId: null,
        updatedAt: new Date(),
      })
      .where(eq(communityRole.id, input.communityRoleId))

    const updatedCommunityRole = await adminCommunityRoleEntityGet(input.communityRoleId)

    if (!updatedCommunityRole) {
      return {
        status: 'community-role-updated-but-not-loaded' as const,
      }
    }

    return {
      communityRole: updatedCommunityRole,
      mapping: adminCommunityRoleCreateDiscordMappingStatus({
        connection: null,
        discordRoleId: null,
        guildRole: null,
      }),
      status: 'success' as const,
    }
  }

  const [mappedCommunityRole] = await db
    .select({
      id: communityRole.id,
      name: communityRole.name,
    })
    .from(communityRole)
    .where(
      and(
        eq(communityRole.discordRoleId, input.discordRoleId),
        ne(communityRole.id, input.communityRoleId),
        eq(communityRole.organizationId, existingCommunityRole.organizationId),
      ),
    )
    .limit(1)

  if (mappedCommunityRole) {
    return {
      communityRoleName: mappedCommunityRole.name,
      status: 'discord-role-already-mapped' as const,
    }
  }

  const guildRolesResult = await adminCommunityRoleDiscordGuildRolesGet(existingCommunityRole.organizationId)

  if (!guildRolesResult.connection) {
    return {
      status: 'discord-connection-not-found' as const,
    }
  }

  const blockingCheck =
    guildRolesResult.connection.diagnostics.checks.find((check) =>
      adminCommunityRoleBlockingDiscordGuildRoleChecks.has(check),
    ) ?? null

  if (blockingCheck) {
    return {
      check: blockingCheck,
      status: 'discord-connection-blocked' as const,
    }
  }

  const selectedGuildRole =
    guildRolesResult.guildRoles.find((guildRole) => guildRole.id === input.discordRoleId) ?? null

  if (!selectedGuildRole) {
    return {
      status: 'discord-role-not-found' as const,
    }
  }

  if (selectedGuildRole.isDefault) {
    return {
      status: 'discord-role-default' as const,
    }
  }

  if (selectedGuildRole.managed) {
    return {
      status: 'discord-role-managed' as const,
    }
  }

  await db
    .update(communityRole)
    .set({
      discordRoleId: input.discordRoleId,
      updatedAt: new Date(),
    })
    .where(eq(communityRole.id, input.communityRoleId))

  const updatedCommunityRole = await adminCommunityRoleEntityGet(input.communityRoleId)

  if (!updatedCommunityRole) {
    return {
      status: 'community-role-updated-but-not-loaded' as const,
    }
  }

  return {
    communityRole: updatedCommunityRole,
    mapping: adminCommunityRoleCreateDiscordMappingStatus({
      connection: guildRolesResult.connection,
      discordRoleId: input.discordRoleId,
      guildRole: selectedGuildRole,
    }),
    status: 'success' as const,
  }
}
