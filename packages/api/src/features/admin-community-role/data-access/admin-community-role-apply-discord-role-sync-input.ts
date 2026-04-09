import z from 'zod'

import { adminCommunityRoleApplyDiscordRoleSyncInputSchema } from './admin-community-role-apply-discord-role-sync-input-schema'

export type AdminCommunityRoleApplyDiscordRoleSyncInput = z.infer<
  typeof adminCommunityRoleApplyDiscordRoleSyncInputSchema
>
