import z from 'zod'

import { adminOrganizationSetDiscordRoleSyncEnabledInputSchema } from './admin-organization-set-discord-role-sync-enabled-input-schema'

export type AdminOrganizationSetDiscordRoleSyncEnabledInput = z.infer<
  typeof adminOrganizationSetDiscordRoleSyncEnabledInputSchema
>
