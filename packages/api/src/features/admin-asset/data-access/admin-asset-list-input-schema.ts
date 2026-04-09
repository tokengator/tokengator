import z from 'zod'
import { RESOLVER_KINDS } from '@tokengator/indexer'

export const adminAssetResolverKindSchema = z.enum(RESOLVER_KINDS)

export const adminAssetListInputSchema = z.object({
  address: z.string().trim().min(1).optional(),
  assetGroupId: z.string().min(1),
  limit: z.number().int().max(200).min(1).optional(),
  offset: z.number().int().min(0).optional(),
  owner: z.string().trim().min(1).optional(),
  resolverKind: adminAssetResolverKindSchema.optional(),
})
