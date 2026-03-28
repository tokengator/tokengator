import { ORPCError } from '@orpc/server'
import { and, asc, count, eq, sql } from 'drizzle-orm'
import z from 'zod'
import { db } from '@tokengator/db'
import { asset, assetGroup } from '@tokengator/db/schema/asset'

import { adminProcedure } from '../index'

const assetResolverKindSchema = z.enum(['helius-collection-assets', 'helius-token-accounts'])

const listAssetsInputSchema = z.object({
  address: z.string().trim().min(1).optional(),
  assetGroupId: z.string().min(1),
  limit: z.number().int().max(200).min(1).optional(),
  offset: z.number().int().min(0).optional(),
  owner: z.string().trim().min(1).optional(),
  resolverKind: assetResolverKindSchema.optional(),
})

function createContainsPattern(search?: string) {
  if (!search) {
    return undefined
  }

  return `%${search.toLowerCase().replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`
}

function parseStoredJson(value: string | null) {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

async function ensureAssetGroupExists(assetGroupId: string) {
  const [record] = await db
    .select({
      id: assetGroup.id,
    })
    .from(assetGroup)
    .where(eq(assetGroup.id, assetGroupId))
    .limit(1)

  return record ?? null
}

async function getAssetRecordById(id: string) {
  const [record] = await db
    .select({
      address: asset.address,
      addressLower: asset.addressLower,
      amount: asset.amount,
      assetGroupId: asset.assetGroupId,
      firstSeenAt: asset.firstSeenAt,
      id: asset.id,
      indexedAssetId: asset.indexedAssetId,
      indexedAt: asset.indexedAt,
      lastSeenAt: asset.lastSeenAt,
      metadata: asset.metadata,
      metadataDescription: asset.metadataDescription,
      metadataImageUrl: asset.metadataImageUrl,
      metadataJson: asset.metadataJson,
      metadataJsonUrl: asset.metadataJsonUrl,
      metadataName: asset.metadataName,
      metadataProgramAccount: asset.metadataProgramAccount,
      metadataSymbol: asset.metadataSymbol,
      owner: asset.owner,
      ownerLower: asset.ownerLower,
      page: asset.page,
      raw: asset.raw,
      resolverId: asset.resolverId,
      resolverKind: asset.resolverKind,
    })
    .from(asset)
    .where(eq(asset.id, id))
    .limit(1)

  if (!record) {
    return null
  }

  return {
    ...record,
    metadata: parseStoredJson(record.metadata),
    metadataJson: parseStoredJson(record.metadataJson),
    raw: parseStoredJson(record.raw),
  }
}

export const adminAssetRouter = {
  delete: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
      }),
    )
    .handler(async ({ input }) => {
      const existingAsset = await getAssetRecordById(input.id)

      if (!existingAsset) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Asset not found.',
        })
      }

      await db.delete(asset).where(eq(asset.id, input.id))

      return {
        assetGroupId: existingAsset.assetGroupId,
        id: existingAsset.id,
      }
    }),

  list: adminProcedure.input(listAssetsInputSchema).handler(async ({ input }) => {
    const existingAssetGroup = await ensureAssetGroupExists(input.assetGroupId)

    if (!existingAssetGroup) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Asset group not found.',
      })
    }

    const limit = input.limit ?? 50
    const offset = input.offset ?? 0
    const addressPattern = createContainsPattern(input.address)
    const ownerPattern = createContainsPattern(input.owner)
    const filters = [eq(asset.assetGroupId, input.assetGroupId)]

    if (addressPattern) {
      filters.push(sql`${asset.addressLower} like ${addressPattern} escape '\\'`)
    }

    if (ownerPattern) {
      filters.push(sql`${asset.ownerLower} like ${ownerPattern} escape '\\'`)
    }

    if (input.resolverKind) {
      filters.push(eq(asset.resolverKind, input.resolverKind))
    }

    const whereClause = and(...filters)

    const assets = await db
      .select({
        address: asset.address,
        addressLower: asset.addressLower,
        amount: asset.amount,
        assetGroupId: asset.assetGroupId,
        firstSeenAt: asset.firstSeenAt,
        id: asset.id,
        indexedAssetId: asset.indexedAssetId,
        indexedAt: asset.indexedAt,
        lastSeenAt: asset.lastSeenAt,
        metadata: asset.metadata,
        metadataDescription: asset.metadataDescription,
        metadataImageUrl: asset.metadataImageUrl,
        metadataJson: asset.metadataJson,
        metadataJsonUrl: asset.metadataJsonUrl,
        metadataName: asset.metadataName,
        metadataProgramAccount: asset.metadataProgramAccount,
        metadataSymbol: asset.metadataSymbol,
        owner: asset.owner,
        ownerLower: asset.ownerLower,
        page: asset.page,
        raw: asset.raw,
        resolverId: asset.resolverId,
        resolverKind: asset.resolverKind,
      })
      .from(asset)
      .where(whereClause)
      .orderBy(asc(asset.ownerLower), asc(asset.addressLower), asc(asset.resolverKind))
      .limit(limit)
      .offset(offset)

    const [totalResult] = await db
      .select({
        count: count(),
      })
      .from(asset)
      .where(whereClause)

    return {
      assets: assets.map((assetRecord) => ({
        ...assetRecord,
        metadata: parseStoredJson(assetRecord.metadata),
        metadataJson: parseStoredJson(assetRecord.metadataJson),
        raw: parseStoredJson(assetRecord.raw),
      })),
      limit,
      offset,
      total: totalResult?.count ?? 0,
    }
  }),
}
