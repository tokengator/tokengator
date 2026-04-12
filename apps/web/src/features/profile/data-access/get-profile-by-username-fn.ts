import { createServerFn } from '@tanstack/react-start'
import z from 'zod'
import type { ProfileUserEntity } from '@tokengator/sdk'

import { authMiddleware } from '@/features/auth/data-access/auth-middleware'
import { serverOrpcClient } from '@/lib/orpc-server'

const profileByUsernameInputSchema = z.object({
  username: z.string().min(1),
})

export const getProfileByUsername = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator((input: { username: string }) => profileByUsernameInputSchema.parse(input))
  .handler(async ({ context, data }) => {
    if (!context.session) {
      return null
    }

    return (await serverOrpcClient.profile.getByUsername({
      username: data.username,
    })) satisfies ProfileUserEntity
  })
