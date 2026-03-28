import { ORPCError } from '@orpc/server'
import { asc, count, eq, or, sql } from 'drizzle-orm'
import z from 'zod'
import { db } from '@tokengator/db'
import { assetGroup } from '@tokengator/db/schema/asset'

import { adminProcedure } from '../index'

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
      const existingAssetGroup = await getAssetGroupRecordById(input.assetGroupId)

      if (!existingAssetGroup) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Asset group not found.',
        })
      }

      return existingAssetGroup
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

    return {
      assetGroups,
      limit,
      offset,
      total: totalResult?.count ?? 0,
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
