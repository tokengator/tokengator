import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'

import { adminOrganizationRefreshDiscordConnection as adminOrganizationRefreshDiscordConnectionDataAccess } from '../data-access/admin-organization-refresh-discord-connection'
import { adminOrganizationRefreshDiscordConnectionInputSchema } from '../data-access/admin-organization-refresh-discord-connection-input-schema'

export const adminOrganizationFeatureRefreshDiscordConnection = adminProcedure
  .input(adminOrganizationRefreshDiscordConnectionInputSchema)
  .handler(async ({ input }) => {
    const result = await adminOrganizationRefreshDiscordConnectionDataAccess(input.organizationId)

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

    return result.connection
  })
