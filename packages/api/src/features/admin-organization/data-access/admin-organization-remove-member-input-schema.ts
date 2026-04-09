import z from 'zod'

export const adminOrganizationRemoveMemberInputSchema = z.object({
  memberId: z.string().min(1),
})
