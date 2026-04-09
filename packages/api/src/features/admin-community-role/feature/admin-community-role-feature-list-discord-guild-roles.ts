import { ORPCError } from '@orpc/server'

import { adminProcedure } from '../../../lib/prodecures'
import { adminCommunityRoleListDiscordGuildRoles as adminCommunityRoleListDiscordGuildRolesDataAccess } from '../data-access/admin-community-role-list-discord-guild-roles'
import { adminCommunityRoleListDiscordGuildRolesInputSchema } from '../data-access/admin-community-role-list-discord-guild-roles-input-schema'

export const adminCommunityRoleFeatureListDiscordGuildRoles = adminProcedure
  .input(adminCommunityRoleListDiscordGuildRolesInputSchema)
  .handler(async ({ input }) => {
    const result = await adminCommunityRoleListDiscordGuildRolesDataAccess(input.organizationId)

    if (!result) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Organization not found.',
      })
    }

    return result
  })
