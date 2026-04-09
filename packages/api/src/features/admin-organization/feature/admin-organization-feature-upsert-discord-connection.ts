import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/prodecures'

import { adminOrganizationUpsertDiscordConnection as adminOrganizationUpsertDiscordConnectionDataAccess } from '../data-access/admin-organization-upsert-discord-connection'
import { adminOrganizationUpsertDiscordConnectionInputSchema } from '../data-access/admin-organization-upsert-discord-connection-input-schema'

export const adminOrganizationFeatureUpsertDiscordConnection = adminProcedure
  .input(adminOrganizationUpsertDiscordConnectionInputSchema)
  .handler(async ({ input }) => {
    const result = await adminOrganizationUpsertDiscordConnectionDataAccess(input)

    if (result.status === 'organization-not-found') {
      throw new ORPCError('NOT_FOUND', {
        message: 'Organization not found.',
      })
    }

    return result.connection
  })
