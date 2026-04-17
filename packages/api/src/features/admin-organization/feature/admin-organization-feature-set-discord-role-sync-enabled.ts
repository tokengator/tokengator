import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'

import { adminOrganizationSetDiscordRoleSyncEnabled as adminOrganizationSetDiscordRoleSyncEnabledDataAccess } from '../data-access/admin-organization-set-discord-role-sync-enabled'
import { adminOrganizationSetDiscordRoleSyncEnabledInputSchema } from '../data-access/admin-organization-set-discord-role-sync-enabled-input-schema'

export const adminOrganizationFeatureSetDiscordRoleSyncEnabled = adminProcedure
  .input(adminOrganizationSetDiscordRoleSyncEnabledInputSchema)
  .handler(async ({ input }) => {
    const result = await adminOrganizationSetDiscordRoleSyncEnabledDataAccess(input)

    if (result.status === 'organization-not-found') {
      throw new ORPCError('NOT_FOUND', {
        message: 'Organization not found.',
      })
    }

    if (result.status === 'discord-connection-not-found') {
      throw new ORPCError('NOT_FOUND', {
        message: 'Discord connection not found.',
      })
    }

    if (result.status === 'organization-updated-but-not-loaded') {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Organization was updated but could not be loaded.',
      })
    }

    return result.organization
  })
