import z from 'zod'

import { adminCommunityRoleSetDiscordRoleMappingInputSchema } from './admin-community-role-set-discord-role-mapping-input-schema'

export type AdminCommunityRoleSetDiscordRoleMappingInput = z.infer<
  typeof adminCommunityRoleSetDiscordRoleMappingInputSchema
>
