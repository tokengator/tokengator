import z from 'zod'

import { adminOrganizationDeleteDiscordConnectionInputSchema } from './admin-organization-delete-discord-connection-input-schema'

export type AdminOrganizationDeleteDiscordConnectionInput = z.infer<
  typeof adminOrganizationDeleteDiscordConnectionInputSchema
>
