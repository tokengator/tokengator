import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/procedures'

import { adminOrganizationDeleteDiscordConnection as adminOrganizationDeleteDiscordConnectionDataAccess } from '../data-access/admin-organization-delete-discord-connection'
import { adminOrganizationDeleteDiscordConnectionInputSchema } from '../data-access/admin-organization-delete-discord-connection-input-schema'

export const adminOrganizationFeatureDeleteDiscordConnection = adminProcedure
  .input(adminOrganizationDeleteDiscordConnectionInputSchema)
  .handler(async ({ input }) => {
    const result = await adminOrganizationDeleteDiscordConnectionDataAccess(input.organizationId)

    if (!result) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Organization not found.',
      })
    }

    return result
  })
