import { ORPCError } from '@orpc/server'
import { DiscordGuildMemberLookupError } from '@tokengator/discord'

import { adminProcedure } from '../../../lib/prodecures'
import { adminCommunityRolePreviewDiscordRoleSync as adminCommunityRolePreviewDiscordRoleSyncDataAccess } from '../data-access/admin-community-role-preview-discord-role-sync'
import { adminCommunityRolePreviewDiscordRoleSyncInputSchema } from '../data-access/admin-community-role-preview-discord-role-sync-input-schema'

export const adminCommunityRoleFeaturePreviewDiscordRoleSync = adminProcedure
  .input(adminCommunityRolePreviewDiscordRoleSyncInputSchema)
  .handler(async ({ input }) => {
    try {
      const result = await adminCommunityRolePreviewDiscordRoleSyncDataAccess(input.organizationId)

      if (result.status === 'organization-not-found') {
        throw new ORPCError('NOT_FOUND', {
          message: 'Organization not found.',
        })
      }

      if (result.status === 'discord-connection-not-found') {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Connect a Discord server for this community before syncing Discord roles.',
        })
      }

      return result.result
    } catch (error) {
      if (error instanceof DiscordGuildMemberLookupError) {
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

      throw error
    }
  })
