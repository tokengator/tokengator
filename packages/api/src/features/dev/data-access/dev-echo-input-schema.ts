import z from 'zod'

export const devEchoInputSchema = z.object({
  text: z.string().min(1),
})

export type DevEchoInput = z.infer<typeof devEchoInputSchema>
