import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/prodecures'
import { adminCommunityRoleSetDiscordRoleMapping as adminCommunityRoleSetDiscordRoleMappingDataAccess } from '../data-access/admin-community-role-set-discord-role-mapping'
import { adminCommunityRoleSetDiscordRoleMappingInputSchema } from '../data-access/admin-community-role-set-discord-role-mapping-input-schema'
import { adminCommunityRoleDiscordGuildRoleInspectionCheckMessages } from '../util/admin-community-role-discord-mapping-status'

export const adminCommunityRoleFeatureSetDiscordRoleMapping = adminProcedure
  .input(adminCommunityRoleSetDiscordRoleMappingInputSchema)
  .handler(async ({ input }) => {
    const result = await adminCommunityRoleSetDiscordRoleMappingDataAccess(input)

    if (result.status === 'community-role-not-found') {
      throw new ORPCError('NOT_FOUND', {
        message: 'Community role not found.',
      })
    }

    if (result.status === 'community-role-updated-but-not-loaded') {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Community role was updated but could not be loaded.',
      })
    }

    if (result.status === 'discord-connection-not-found') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Connect a Discord server for this community before mapping roles.',
      })
    }

    if (result.status === 'discord-role-already-mapped') {
      throw new ORPCError('BAD_REQUEST', {
        message: `Discord role is already mapped to ${result.communityRoleName}.`,
      })
    }

    if (result.status === 'discord-connection-blocked') {
      throw new ORPCError('BAD_REQUEST', {
        message: adminCommunityRoleDiscordGuildRoleInspectionCheckMessages[result.check],
      })
    }

    if (result.status === 'discord-role-not-found') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Selected Discord role was not found in the connected server.',
      })
    }

    if (result.status === 'discord-role-default') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'The @everyone Discord role cannot be mapped.',
      })
    }

    if (result.status === 'discord-role-managed') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Managed Discord roles cannot be mapped.',
      })
    }

    return {
      communityRole: result.communityRole,
      mapping: result.mapping,
    }
  })
