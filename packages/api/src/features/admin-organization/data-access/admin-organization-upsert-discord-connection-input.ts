import z from 'zod'

import { adminOrganizationUpsertDiscordConnectionInputSchema } from './admin-organization-upsert-discord-connection-input-schema'

export type AdminOrganizationUpsertDiscordConnectionInput = z.infer<
  typeof adminOrganizationUpsertDiscordConnectionInputSchema
>
