import { createServerFn } from '@tanstack/react-start'
import z from 'zod'
import type { AdminUserGetInput } from '@tokengator/sdk'

import { authMiddleware } from '@/features/auth/data-access/auth-middleware'
import { serverOrpcClient } from '@/lib/orpc-server'

const adminUserGetInputSchema = z.object({
  userId: z.string().min(1),
})

export const getAdminUser = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator((input: AdminUserGetInput) => adminUserGetInputSchema.parse(input))
  .handler(async ({ data }) => {
    return serverOrpcClient.adminUser.get({
      userId: data.userId,
    })
  })
