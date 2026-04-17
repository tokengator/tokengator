import z from 'zod'

import { communityDiscordAnnouncementTypes } from '../../../features/community-discord-announcement'

export const adminOrganizationSetDiscordAnnouncementEnabledInputSchema = z.object({
  enabled: z.boolean(),
  organizationId: z.string().min(1),
  type: z.enum(communityDiscordAnnouncementTypes),
})
