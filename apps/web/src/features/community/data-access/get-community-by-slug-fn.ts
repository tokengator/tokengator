import { createServerFn } from '@tanstack/react-start'
import z from 'zod'
import type { CommunityGetBySlugResult } from '@tokengator/sdk'

import { authMiddleware } from '@/features/auth/data-access/auth-middleware'
import { serverOrpcClient } from '@/lib/orpc-server'

const communityBySlugInputSchema = z.object({
  slug: z.string().trim().min(1),
})

export const getCommunityBySlug = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator((input: { slug: string }) => communityBySlugInputSchema.parse(input))
  .handler(async ({ data }) => {
    return (await serverOrpcClient.community.getBySlug({
      slug: data.slug,
    })) satisfies CommunityGetBySlugResult
  })
