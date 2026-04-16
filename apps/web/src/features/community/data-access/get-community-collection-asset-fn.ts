import { createServerFn } from '@tanstack/react-start'
import z from 'zod'
import type { CommunityCollectionAssetDetailEntity } from '@tokengator/sdk'

import { authMiddleware } from '@/features/auth/data-access/auth-middleware'
import { serverOrpcClient } from '@/lib/orpc-server'

const communityCollectionAssetInputSchema = z.object({
  address: z.string().trim().min(1),
  asset: z.string().trim().min(1),
  slug: z.string().trim().min(1),
})

type CommunityCollectionAssetJsonValue =
  | CommunityCollectionAssetJsonValue[]
  | { [key: string]: CommunityCollectionAssetJsonValue }
  | boolean
  | null
  | number
  | string

type CommunityCollectionAssetJsonObject = { [key: string]: CommunityCollectionAssetJsonValue }

export type CommunityCollectionAssetServerFnResult = Omit<CommunityCollectionAssetDetailEntity, 'metadataJson'> & {
  metadataJson: CommunityCollectionAssetJsonObject | null
}

function isCommunityCollectionAssetJsonValue(value: unknown): value is CommunityCollectionAssetJsonValue {
  if (value == null) {
    return true
  }

  if (Array.isArray(value)) {
    return value.every((item) => isCommunityCollectionAssetJsonValue(item))
  }

  if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return true
  }

  if (typeof value !== 'object') {
    return false
  }

  return Object.values(value).every((item) => isCommunityCollectionAssetJsonValue(item))
}

function isCommunityCollectionAssetJsonObject(value: unknown): value is CommunityCollectionAssetJsonObject {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  return Object.values(value).every((item) => isCommunityCollectionAssetJsonValue(item))
}

function toCommunityCollectionAssetServerFnResult(
  asset: CommunityCollectionAssetDetailEntity,
): CommunityCollectionAssetServerFnResult {
  if (asset.metadataJson !== null && !isCommunityCollectionAssetJsonObject(asset.metadataJson)) {
    throw new Error('Collection asset metadata JSON must be JSON serializable.')
  }

  return {
    ...asset,
    metadataJson: asset.metadataJson,
  }
}

export const getCommunityCollectionAsset = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator((input: { address: string; asset: string; slug: string }) =>
    communityCollectionAssetInputSchema.parse(input),
  )
  .handler(async ({ data }) => {
    return toCommunityCollectionAssetServerFnResult(
      await serverOrpcClient.community.getCollectionAsset({
        address: data.address,
        asset: data.asset,
        slug: data.slug,
      }),
    )
  })
