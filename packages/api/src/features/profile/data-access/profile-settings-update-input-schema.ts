import z from 'zod'

export const profileSettingsUpdateInputSchema = z.object({
  developerMode: z.boolean(),
})
