import { createServerFn } from '@tanstack/react-start'
import z from 'zod'
import type { ProfileListIdentitiesByUsernameResult } from '@tokengator/sdk'

import { authMiddleware } from '@/features/auth/data-access/auth-middleware'
import { serverOrpcClient } from '@/lib/orpc-server'

const profileIdentitiesByUsernameInputSchema = z.object({
  username: z.string().min(1),
})

export const getProfileIdentitiesByUsername = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator((input: { username: string }) => profileIdentitiesByUsernameInputSchema.parse(input))
  .handler(async ({ context, data }) => {
    if (!context.session) {
      return null
    }

    return (await serverOrpcClient.profile.listIdentitiesByUsername({
      username: data.username,
    })) satisfies ProfileListIdentitiesByUsernameResult
  })
