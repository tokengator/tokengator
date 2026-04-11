import z from 'zod'

export const adminUserCommunityMembershipRemoveInputSchema = z.object({
  memberId: z.string().min(1),
  userId: z.string().min(1),
})
