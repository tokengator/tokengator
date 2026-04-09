import z from 'zod'

import { adminCommunityRolePreviewDiscordRoleSyncInputSchema } from './admin-community-role-preview-discord-role-sync-input-schema'

export type AdminCommunityRolePreviewDiscordRoleSyncInput = z.infer<
  typeof adminCommunityRolePreviewDiscordRoleSyncInputSchema
>
