import { ORPCError } from '@orpc/server'
import { DiscordGuildMemberLookupError } from '@tokengator/discord'

import { AutomationLockConflictError } from '../../../lib/automation-lock'
import { adminProcedure } from '../../../lib/procedures'
import { adminCommunityRoleApplyDiscordRoleSync as adminCommunityRoleApplyDiscordRoleSyncDataAccess } from '../data-access/admin-community-role-apply-discord-role-sync'
import { adminCommunityRoleApplyDiscordRoleSyncInputSchema } from '../data-access/admin-community-role-apply-discord-role-sync-input-schema'

export const adminCommunityRoleFeatureApplyDiscordRoleSync = adminProcedure
  .input(adminCommunityRoleApplyDiscordRoleSyncInputSchema)
  .handler(async ({ input }) => {
    try {
      const result = await adminCommunityRoleApplyDiscordRoleSyncDataAccess(input.organizationId)

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
      if (error instanceof AutomationLockConflictError) {
        throw new ORPCError('CONFLICT', {
          message: 'A community membership or Discord sync is already running for this organization.',
        })
      }

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
