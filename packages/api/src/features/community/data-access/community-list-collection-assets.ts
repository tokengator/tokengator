import { and, asc, eq, exists, inArray, or, sql, type SQL } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { asset, assetTrait } from '@tokengator/db/schema/asset'

import { getSqliteChunkSize, splitIntoChunks } from '../../../lib/sqlite'

import { communityGetBySlug } from './community-get-by-slug'
import {
  communityCollectionAssetEntityColumns,
  communityCollectionAssetTraitEntityColumns,
  toCommunityCollectionAssetTrait,
  toCommunityCollectionAssetEntity,
  toCommunityListCollectionAssetsResult,
  type CommunityCollectionFacetTotals,
} from './community.entity'

import type { CommunityListCollectionAssetsResult } from './community.entity'

function createCommunityCollectionMetadataSearchPattern(value?: string) {
  const trimmedValue = value?.trim()

  if (!trimmedValue) {
    return null
  }

  const escapedValue = trimmedValue.toLowerCase().replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')

  return `%${escapedValue}%`
}

function normalizeCommunityCollectionSearchTerm(value?: string) {
  const trimmedValue = value?.trim()

  return trimmedValue ? trimmedValue : null
}

function createEmptyCommunityCollectionFacetTotals(
  facetTotals: CommunityCollectionFacetTotals,
): CommunityCollectionFacetTotals {
  return Object.fromEntries(
    Object.entries(facetTotals)
      .sort(([leftGroupId], [rightGroupId]) => leftGroupId.localeCompare(rightGroupId))
      .map(([groupId, group]) => [
        groupId,
        {
          label: group.label,
          options: Object.fromEntries(
            Object.entries(group.options)
              .sort(([leftValue], [rightValue]) => leftValue.localeCompare(rightValue))
              .map(([value, option]) => [
                value,
                {
                  label: option.label,
                  total: 0,
                },
              ]),
          ),
          total: 0,
        },
      ]),
  )
}

function sortCommunityCollectionFacetTotals(
  facetTotals: CommunityCollectionFacetTotals,
): CommunityCollectionFacetTotals {
  return Object.fromEntries(
    Object.entries(facetTotals)
      .sort(([leftGroupId], [rightGroupId]) => leftGroupId.localeCompare(rightGroupId))
      .map(([groupId, group]) => [
        groupId,
        {
          label: group.label,
          options: Object.fromEntries(
            Object.entries(group.options)
              .sort(([leftValue], [rightValue]) => leftValue.localeCompare(rightValue))
              .map(([value, option]) => [value, option]),
          ),
          total: group.total,
        },
      ]),
  )
}

function getCommunityCollectionAssetFilters(input: {
  collectionId: string
  excludedFacetGroupId?: string
  facets?: Record<string, string[]>
  metadataQueryPattern: string | null
  ownerSearchTerm: string | null
  querySearchTerm: string | null
}): SQL<unknown>[] {
  const filters: SQL<unknown>[] = [eq(asset.assetGroupId, input.collectionId)]

  for (const [groupId, values] of Object.entries(input.facets ?? {}).sort(([leftGroupId], [rightGroupId]) =>
    leftGroupId.localeCompare(rightGroupId),
  )) {
    if (groupId === input.excludedFacetGroupId) {
      continue
    }

    filters.push(
      exists(
        db
          .select({
            id: assetTrait.id,
          })
          .from(assetTrait)
          .where(
            and(
              eq(assetTrait.assetId, asset.id),
              eq(assetTrait.traitKey, groupId),
              inArray(assetTrait.traitValue, values),
            ),
          ),
      ),
    )
  }

  if (input.ownerSearchTerm) {
    filters.push(sql`instr(trim(${asset.owner}), ${input.ownerSearchTerm}) > 0`)
  }

  if (input.metadataQueryPattern || input.querySearchTerm) {
    filters.push(
      or(
        input.querySearchTerm ? sql`instr(trim(${asset.address}), ${input.querySearchTerm}) > 0` : undefined,
        input.metadataQueryPattern
          ? sql`coalesce(lower(${asset.metadataName}), '') like ${input.metadataQueryPattern} escape '\\'`
          : undefined,
      )!,
    )
  }

  return filters
}

async function getCommunityCollectionFacetTotals(input: {
  collectionId: string
  facetTotals: CommunityCollectionFacetTotals
  facets?: Record<string, string[]>
  metadataQueryPattern: string | null
  ownerSearchTerm: string | null
  querySearchTerm: string | null
}): Promise<CommunityCollectionFacetTotals> {
  const nextFacetTotals = createEmptyCommunityCollectionFacetTotals(input.facetTotals)
  const facetGroupRows = await db
    .select({
      traitKey: assetTrait.traitKey,
    })
    .from(assetTrait)
    .where(eq(assetTrait.assetGroupId, input.collectionId))
    .groupBy(assetTrait.traitKey)
    .orderBy(asc(assetTrait.traitKey))
  const facetGroupIds = [
    ...new Set([...Object.keys(input.facetTotals), ...facetGroupRows.map((row) => row.traitKey)]),
  ].sort()

  for (const facetGroupId of facetGroupIds) {
    const filters = getCommunityCollectionAssetFilters({
      collectionId: input.collectionId,
      excludedFacetGroupId: facetGroupId,
      facets: input.facets,
      metadataQueryPattern: input.metadataQueryPattern,
      ownerSearchTerm: input.ownerSearchTerm,
      querySearchTerm: input.querySearchTerm,
    })
    const [facetGroupCountRow] = await db
      .select({
        label: sql<string>`min(${assetTrait.traitLabel})`,
        total: sql<number>`cast(count(distinct ${asset.id}) as integer)`,
      })
      .from(asset)
      .innerJoin(assetTrait, eq(assetTrait.assetId, asset.id))
      .where(and(...filters, eq(assetTrait.traitKey, facetGroupId)))
    const facetOptionRows = await db
      .select({
        label: sql<string>`min(${assetTrait.traitLabel})`,
        total: sql<number>`cast(count(distinct ${asset.id}) as integer)`,
        value: assetTrait.traitValue,
        valueLabel: sql<string>`min(${assetTrait.traitValueLabel})`,
      })
      .from(asset)
      .innerJoin(assetTrait, eq(assetTrait.assetId, asset.id))
      .where(and(...filters, eq(assetTrait.traitKey, facetGroupId)))
      .groupBy(assetTrait.traitKey, assetTrait.traitValue)
      .orderBy(asc(assetTrait.traitValue))

    if (!facetGroupCountRow?.label && facetOptionRows.length === 0 && !nextFacetTotals[facetGroupId]) {
      continue
    }

    const currentGroup = nextFacetTotals[facetGroupId] ?? {
      label: facetGroupCountRow?.label ?? facetOptionRows[0]?.label ?? facetGroupId,
      options: {},
      total: 0,
    }

    currentGroup.label = currentGroup.label || facetGroupCountRow?.label || facetOptionRows[0]?.label || facetGroupId
    currentGroup.total = facetGroupCountRow?.total ?? 0

    for (const facetOptionRow of facetOptionRows) {
      currentGroup.options[facetOptionRow.value] = {
        label: currentGroup.options[facetOptionRow.value]?.label ?? facetOptionRow.valueLabel,
        total: facetOptionRow.total,
      }
    }

    nextFacetTotals[facetGroupId] = currentGroup
  }

  return sortCommunityCollectionFacetTotals(nextFacetTotals)
}

export async function communityListCollectionAssets(input: {
  address: string
  facets?: Record<string, string[]>
  owner?: string
  query?: string
  slug: string
}): Promise<CommunityListCollectionAssetsResult | null> {
  const community = await communityGetBySlug(input.slug)

  if (!community) {
    return null
  }

  const collection = community.collections.find((currentCollection) => currentCollection.address === input.address)

  if (!collection) {
    return null
  }

  const metadataQueryPattern = createCommunityCollectionMetadataSearchPattern(input.query)
  const ownerSearchTerm = normalizeCommunityCollectionSearchTerm(input.owner)
  const querySearchTerm = normalizeCommunityCollectionSearchTerm(input.query)
  const visibleLabelExpression = sql<string>`coalesce(nullif(lower(${asset.metadataName}), ''), ${asset.address})`
  const filters = getCommunityCollectionAssetFilters({
    collectionId: collection.id,
    facets: input.facets,
    metadataQueryPattern,
    ownerSearchTerm,
    querySearchTerm,
  })

  const assets = await db
    .select(communityCollectionAssetEntityColumns)
    .from(asset)
    .where(and(...filters))
    .orderBy(asc(visibleLabelExpression), asc(asset.owner), asc(asset.address), asc(asset.id))
  const assetIds = assets.map((currentAsset) => currentAsset.id)
  const traitRows: Array<{
    assetId: string
    groupId: string
    groupLabel: string
    value: string
    valueLabel: string
  }> = []

  for (const assetIdChunk of splitIntoChunks(assetIds, getSqliteChunkSize(1))) {
    if (assetIdChunk.length === 0) {
      continue
    }

    traitRows.push(
      ...(await db
        .select(communityCollectionAssetTraitEntityColumns)
        .from(assetTrait)
        .where(inArray(assetTrait.assetId, assetIdChunk))
        .orderBy(asc(assetTrait.assetId), asc(assetTrait.traitKey), asc(assetTrait.traitValue), asc(assetTrait.id))),
    )
  }
  const traitsByAssetId = new Map<string, ReturnType<typeof toCommunityCollectionAssetTrait>[]>()

  for (const traitRow of traitRows) {
    const currentTraits = traitsByAssetId.get(traitRow.assetId) ?? []

    currentTraits.push(
      toCommunityCollectionAssetTrait({
        groupId: traitRow.groupId,
        groupLabel: traitRow.groupLabel,
        value: traitRow.value,
        valueLabel: traitRow.valueLabel,
      }),
    )
    traitsByAssetId.set(traitRow.assetId, currentTraits)
  }
  const facetTotals = await getCommunityCollectionFacetTotals({
    collectionId: collection.id,
    facets: input.facets,
    facetTotals: collection.facetTotals,
    metadataQueryPattern,
    ownerSearchTerm,
    querySearchTerm,
  })

  return toCommunityListCollectionAssetsResult({
    assets: assets.map((currentAsset) =>
      toCommunityCollectionAssetEntity({
        ...currentAsset,
        traits: traitsByAssetId.get(currentAsset.id) ?? [],
      }),
    ),
    facetTotals,
  })
}
