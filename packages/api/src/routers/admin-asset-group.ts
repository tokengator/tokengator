import { ORPCError } from '@orpc/server'
import { asc, count, eq, or, sql } from 'drizzle-orm'
import z from 'zod'
import { db } from '@tokengator/db'
import { assetGroup } from '@tokengator/db/schema/asset'
import { env } from '@tokengator/env/api'

import { adminProcedure } from '../index'
import {
  AssetGroupIndexConfigError,
  getAssetGroupIndexStatusSummaries,
  indexAssetGroup,
  listAssetGroupIndexRuns,
} from '../lib/admin-asset-group-index'
import { AutomationLockConflictError } from '../lib/automation-lock'

const assetGroupTypeSchema = z.enum(['collection', 'mint'])

const listAssetGroupsInputSchema = z
  .object({
    limit: z.number().int().max(100).min(1).optional(),
    offset: z.number().int().min(0).optional(),
    search: z.string().trim().min(1).optional(),
  })
  .optional()

function createSearchPattern(search?: string) {
  if (!search) {
    return undefined
  }

  return `%${search.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`
}

function getAssetGroupFilter(search?: string) {
  const pattern = createSearchPattern(search)

  if (!pattern) {
    return undefined
  }

  return or(
    sql`${assetGroup.address} like ${pattern} escape '\\'`,
    sql`${assetGroup.label} like ${pattern} escape '\\'`,
    sql`${assetGroup.type} like ${pattern} escape '\\'`,
  )
}

async function getAssetGroupRecordById(assetGroupId: string) {
  const [record] = await db
    .select({
      address: assetGroup.address,
      createdAt: assetGroup.createdAt,
      enabled: assetGroup.enabled,
      id: assetGroup.id,
      indexingStartedAt: assetGroup.indexingStartedAt,
      label: assetGroup.label,
      type: assetGroup.type,
      updatedAt: assetGroup.updatedAt,
    })
    .from(assetGroup)
    .where(eq(assetGroup.id, assetGroupId))
    .limit(1)

  return record ?? null
}

async function getAssetGroupWithIndexingStatus(assetGroupId: string) {
  const record = await getAssetGroupRecordById(assetGroupId)

  if (!record) {
    return null
  }

  const indexingStatus =
    (
      await getAssetGroupIndexStatusSummaries({
        assetGroupIds: [assetGroupId],
      })
    ).get(assetGroupId) ?? null

  return {
    ...record,
    indexingStatus,
  }
}

export const adminAssetGroupRouter = {
  create: adminProcedure
    .input(
      z.object({
        address: z.string().trim().min(1),
        enabled: z.boolean().optional(),
        label: z.string().trim().min(1),
        type: assetGroupTypeSchema,
      }),
    )
    .handler(async ({ input }) => {
      const now = new Date()
      const id = crypto.randomUUID()

      await db.insert(assetGroup).values({
        address: input.address,
        createdAt: now,
        enabled: input.enabled ?? true,
        id,
        label: input.label,
        type: input.type,
        updatedAt: now,
      })

      const createdAssetGroup = await getAssetGroupRecordById(id)

      if (!createdAssetGroup) {
        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          message: 'Asset group was created but could not be loaded.',
        })
      }

      return createdAssetGroup
    }),

  delete: adminProcedure
    .input(
      z.object({
        assetGroupId: z.string().min(1),
      }),
    )
    .handler(async ({ input }) => {
      const existingAssetGroup = await getAssetGroupRecordById(input.assetGroupId)

      if (!existingAssetGroup) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Asset group not found.',
        })
      }

      await db.delete(assetGroup).where(eq(assetGroup.id, input.assetGroupId))

      return {
        assetGroupId: input.assetGroupId,
      }
    }),

  get: adminProcedure
    .input(
      z.object({
        assetGroupId: z.string().min(1),
      }),
    )
    .handler(async ({ input }) => {
      const existingAssetGroup = await getAssetGroupWithIndexingStatus(input.assetGroupId)

      if (!existingAssetGroup) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Asset group not found.',
        })
      }

      return existingAssetGroup
    }),

  index: adminProcedure
    .input(
      z.object({
        assetGroupId: z.string().min(1),
      }),
    )
    .handler(async ({ context, input }) => {
      const existingAssetGroup = await getAssetGroupRecordById(input.assetGroupId)

      if (!existingAssetGroup) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Asset group not found.',
        })
      }

      try {
        return await indexAssetGroup({
          apiKey: env.HELIUS_API_KEY,
          assetGroup: {
            address: existingAssetGroup.address,
            id: existingAssetGroup.id,
            type: existingAssetGroup.type,
          },
          debug: env.INDEXER_DEBUG,
          heliusCluster: env.HELIUS_CLUSTER,
          signal: context.requestSignal,
        })
      } catch (error) {
        if (error instanceof AssetGroupIndexConfigError) {
          throw new ORPCError('BAD_REQUEST', {
            message: error.message,
          })
        }

        if (error instanceof AutomationLockConflictError) {
          throw new ORPCError('CONFLICT', {
            message: 'Asset indexing is already running for this asset group.',
          })
        }

        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          message: error instanceof Error ? error.message : 'Asset indexing failed.',
        })
      }
    }),

  list: adminProcedure.input(listAssetGroupsInputSchema).handler(async ({ input }) => {
    const limit = input?.limit ?? 25
    const offset = input?.offset ?? 0
    const whereClause = getAssetGroupFilter(input?.search)
    const assetGroups = whereClause
      ? await db
          .select({
            address: assetGroup.address,
            createdAt: assetGroup.createdAt,
            enabled: assetGroup.enabled,
            id: assetGroup.id,
            indexingStartedAt: assetGroup.indexingStartedAt,
            label: assetGroup.label,
            type: assetGroup.type,
            updatedAt: assetGroup.updatedAt,
          })
          .from(assetGroup)
          .where(whereClause)
          .orderBy(asc(assetGroup.label), asc(assetGroup.type), asc(assetGroup.address))
          .limit(limit)
          .offset(offset)
      : await db
          .select({
            address: assetGroup.address,
            createdAt: assetGroup.createdAt,
            enabled: assetGroup.enabled,
            id: assetGroup.id,
            indexingStartedAt: assetGroup.indexingStartedAt,
            label: assetGroup.label,
            type: assetGroup.type,
            updatedAt: assetGroup.updatedAt,
          })
          .from(assetGroup)
          .orderBy(asc(assetGroup.label), asc(assetGroup.type), asc(assetGroup.address))
          .limit(limit)
          .offset(offset)

    const [totalResult] = whereClause
      ? await db
          .select({
            count: count(),
          })
          .from(assetGroup)
          .where(whereClause)
      : await db
          .select({
            count: count(),
          })
          .from(assetGroup)

    const indexingStatusByAssetGroupId = await getAssetGroupIndexStatusSummaries({
      assetGroupIds: assetGroups.map((currentAssetGroup) => currentAssetGroup.id),
    })

    return {
      assetGroups: assetGroups.map((currentAssetGroup) => ({
        ...currentAssetGroup,
        indexingStatus: indexingStatusByAssetGroupId.get(currentAssetGroup.id) ?? null,
      })),
      limit,
      offset,
      total: totalResult?.count ?? 0,
    }
  }),

  listIndexRuns: adminProcedure
    .input(
      z.object({
        assetGroupId: z.string().min(1),
        limit: z.number().int().max(50).min(1).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existingAssetGroup = await getAssetGroupRecordById(input.assetGroupId)

      if (!existingAssetGroup) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Asset group not found.',
        })
      }

      return {
        indexRuns: await listAssetGroupIndexRuns({
          assetGroupId: input.assetGroupId,
          limit: input.limit ?? 10,
        }),
      }
    }),

  update: adminProcedure
    .input(
      z.object({
        assetGroupId: z.string().min(1),
        data: z.object({
          address: z.string().trim().min(1),
          enabled: z.boolean(),
          label: z.string().trim().min(1),
          type: assetGroupTypeSchema,
        }),
      }),
    )
    .handler(async ({ input }) => {
      const existingAssetGroup = await getAssetGroupRecordById(input.assetGroupId)

      if (!existingAssetGroup) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Asset group not found.',
        })
      }

      const updatedAt = new Date()

      await db
        .update(assetGroup)
        .set({
          address: input.data.address,
          enabled: input.data.enabled,
          label: input.data.label,
          type: input.data.type,
          updatedAt,
        })
        .where(eq(assetGroup.id, input.assetGroupId))

      return {
        ...existingAssetGroup,
        address: input.data.address,
        enabled: input.data.enabled,
        label: input.data.label,
        type: input.data.type,
        updatedAt,
      }
    }),
}
