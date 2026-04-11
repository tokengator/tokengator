import z from 'zod'

import { profileSettingsUpdateInputSchema } from './profile-settings-update-input-schema'

export type ProfileSettingsUpdateInput = z.infer<typeof profileSettingsUpdateInputSchema>
