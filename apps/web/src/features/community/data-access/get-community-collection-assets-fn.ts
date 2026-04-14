import { createServerFn } from '@tanstack/react-start'
import z from 'zod'
import type { CommunityListCollectionAssetsResult } from '@tokengator/sdk'

import { authMiddleware } from '@/features/auth/data-access/auth-middleware'
import { serverOrpcClient } from '@/lib/orpc-server'

const communityCollectionAssetsInputSchema = z.object({
  address: z.string().trim().min(1),
  owner: z.string().trim().min(1).optional(),
  query: z.string().trim().min(1).optional(),
  slug: z.string().trim().min(1),
})

export const getCommunityCollectionAssets = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator((input: { address: string; owner?: string; query?: string; slug: string }) =>
    communityCollectionAssetsInputSchema.parse(input),
  )
  .handler(async ({ data }) => {
    return (await serverOrpcClient.community.listCollectionAssets({
      address: data.address,
      owner: data.owner,
      query: data.query,
      slug: data.slug,
    })) satisfies CommunityListCollectionAssetsResult
  })
