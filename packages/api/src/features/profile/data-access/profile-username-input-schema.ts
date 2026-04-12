import z from 'zod'

export const profileUsernameInputSchema = z.object({
  username: z.string().min(1),
})
