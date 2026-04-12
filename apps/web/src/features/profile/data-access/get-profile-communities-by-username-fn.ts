import { createServerFn } from '@tanstack/react-start'
import z from 'zod'
import type { ProfileListCommunitiesByUsernameResult } from '@tokengator/sdk'

import { authMiddleware } from '@/features/auth/data-access/auth-middleware'
import { serverOrpcClient } from '@/lib/orpc-server'

const profileCommunitiesByUsernameInputSchema = z.object({
  username: z.string().min(1),
})

export const getProfileCommunitiesByUsername = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator((input: { username: string }) => profileCommunitiesByUsernameInputSchema.parse(input))
  .handler(async ({ context, data }) => {
    if (!context.session) {
      return null
    }

    return (await serverOrpcClient.profile.listCommunitiesByUsername({
      username: data.username,
    })) satisfies ProfileListCommunitiesByUsernameResult
  })
