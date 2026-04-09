import z from 'zod'

import { adminCommunityRoleListDiscordGuildRolesInputSchema } from './admin-community-role-list-discord-guild-roles-input-schema'

export type AdminCommunityRoleListDiscordGuildRolesInput = z.infer<
  typeof adminCommunityRoleListDiscordGuildRolesInputSchema
>
