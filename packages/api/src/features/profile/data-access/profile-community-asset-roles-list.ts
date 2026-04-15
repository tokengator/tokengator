import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@tokengator/db'
import { asset, assetGroup, assetTrait } from '@tokengator/db/schema/asset'
import { solanaWallet } from '@tokengator/db/schema/auth'
import { communityRole, communityRoleCondition } from '@tokengator/db/schema/community-role'
import { normalizeAmountToBigInt } from '@tokengator/indexer'

import { getSqliteChunkSize, splitIntoChunks } from '../../../lib/sqlite'

import type {
  ProfileCommunityAssetRoleEntity,
  ProfileCommunityAssetRoleGroupEntity,
  ProfileCommunityCollectionAssetEntity,
  ProfileCommunityCollectionAssetTraitEntity,
  ProfileCommunityMintAccountEntity,
} from './profile.entity'

type ProfileCommunityAssetRoleConditionRecord = {
  address: string
  assetGroupEnabled: boolean
  id: string
  imageUrl: string | null
  label: string
  maximumAmount: string | null
  minimumAmount: string
  organizationId: string
  roleId: string
  roleMatchMode: 'all' | 'any'
  roleName: string
  roleSlug: string
  type: 'collection' | 'mint'
}

type ProfileCommunityAssetRoleRecord = {
  conditions: ProfileCommunityAssetRoleConditionRecord[]
  id: string
  matchMode: 'all' | 'any'
  name: string
  organizationId: string
  slug: string
}

type ProfileCommunityAssetRow = {
  address: string
  amount: string
  assetGroupId: string
  id: string
  metadataImageUrl: string | null
  metadataName: string | null
  metadataSymbol: string | null
  owner: string
  resolverKind: string
  visibleLabel: string
}

const assetGroupTypeOrder = {
  collection: 0,
  mint: 1,
} as const

function compareProfileCommunityAssetRoleConditions(
  left: Pick<ProfileCommunityAssetRoleConditionRecord, 'address' | 'id' | 'label' | 'type'>,
  right: Pick<ProfileCommunityAssetRoleConditionRecord, 'address' | 'id' | 'label' | 'type'>,
) {
  return (
    assetGroupTypeOrder[left.type] - assetGroupTypeOrder[right.type] ||
    left.label.localeCompare(right.label) ||
    left.address.localeCompare(right.address) ||
    left.id.localeCompare(right.id)
  )
}

function compareProfileCommunityAssetRoles(
  left: Pick<ProfileCommunityAssetRoleRecord, 'id' | 'name' | 'slug'>,
  right: Pick<ProfileCommunityAssetRoleRecord, 'id' | 'name' | 'slug'>,
) {
  return left.name.localeCompare(right.name) || left.slug.localeCompare(right.slug) || left.id.localeCompare(right.id)
}

function getConditionAmount(input: {
  collectionAssetsByAssetGroupId: Map<string, ProfileCommunityCollectionAssetEntity[]>
  condition: Pick<ProfileCommunityAssetRoleConditionRecord, 'id' | 'type'>
  mintAmountsByAssetGroupId: Map<string, bigint>
}) {
  if (input.condition.type === 'collection') {
    return BigInt(input.collectionAssetsByAssetGroupId.get(input.condition.id)?.length ?? 0)
  }

  return input.mintAmountsByAssetGroupId.get(input.condition.id) ?? 0n
}

function isConditionMatched(input: {
  amount: bigint
  condition: Pick<ProfileCommunityAssetRoleConditionRecord, 'assetGroupEnabled' | 'maximumAmount' | 'minimumAmount'>
}) {
  if (!input.condition.assetGroupEnabled) {
    return false
  }

  const maximumAmount = input.condition.maximumAmount ? BigInt(input.condition.maximumAmount) : null
  const minimumAmount = BigInt(input.condition.minimumAmount)

  return input.amount >= minimumAmount && (maximumAmount === null || input.amount <= maximumAmount)
}

function normalizeWalletAddress(address: string) {
  return address.trim()
}

async function listProfileCollectionAssetTraits(assetIds: string[]) {
  const traitsByAssetId = new Map<string, ProfileCommunityCollectionAssetTraitEntity[]>()

  for (const assetIdChunk of splitIntoChunks(assetIds, getSqliteChunkSize(1))) {
    if (assetIdChunk.length === 0) {
      continue
    }

    const traitRows = await db
      .select({
        assetId: assetTrait.assetId,
        groupId: assetTrait.traitKey,
        groupLabel: assetTrait.traitLabel,
        id: assetTrait.id,
        value: assetTrait.traitValue,
        valueLabel: assetTrait.traitValueLabel,
      })
      .from(assetTrait)
      .where(inArray(assetTrait.assetId, assetIdChunk))
      .orderBy(asc(assetTrait.assetId), asc(assetTrait.traitKey), asc(assetTrait.traitValue), asc(assetTrait.id))

    for (const traitRow of traitRows) {
      const existingTraits = traitsByAssetId.get(traitRow.assetId) ?? []

      existingTraits.push({
        groupId: traitRow.groupId,
        groupLabel: traitRow.groupLabel,
        value: traitRow.value,
        valueLabel: traitRow.valueLabel,
      })
      traitsByAssetId.set(traitRow.assetId, existingTraits)
    }
  }

  return traitsByAssetId
}

async function listProfileCommunityAssetRoleConditionRecords(organizationIds: string[]) {
  if (organizationIds.length === 0) {
    return []
  }

  return await db
    .select({
      address: assetGroup.address,
      assetGroupEnabled: assetGroup.enabled,
      id: assetGroup.id,
      imageUrl: assetGroup.imageUrl,
      label: assetGroup.label,
      maximumAmount: communityRoleCondition.maximumAmount,
      minimumAmount: communityRoleCondition.minimumAmount,
      organizationId: communityRole.organizationId,
      roleId: communityRole.id,
      roleMatchMode: communityRole.matchMode,
      roleName: communityRole.name,
      roleSlug: communityRole.slug,
      type: assetGroup.type,
    })
    .from(communityRole)
    .innerJoin(communityRoleCondition, eq(communityRoleCondition.communityRoleId, communityRole.id))
    .innerJoin(assetGroup, eq(assetGroup.id, communityRoleCondition.assetGroupId))
    .where(and(inArray(communityRole.organizationId, organizationIds), eq(communityRole.enabled, true)))
    .orderBy(
      asc(communityRole.organizationId),
      asc(communityRole.name),
      asc(communityRole.slug),
      asc(communityRole.id),
      asc(assetGroup.type),
      asc(assetGroup.label),
      asc(assetGroup.address),
      asc(assetGroup.id),
    )
}

async function listProfileSolanaWalletAddresses(userId: string) {
  const walletRows = await db
    .select({
      address: solanaWallet.address,
    })
    .from(solanaWallet)
    .where(eq(solanaWallet.userId, userId))
    .orderBy(asc(solanaWallet.address))

  return [...new Set(walletRows.map((walletRow) => normalizeWalletAddress(walletRow.address)).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right),
  )
}

function toProfileCommunityAssetRoleGroupEntity(input: {
  collectionAssetsByAssetGroupId: Map<string, ProfileCommunityCollectionAssetEntity[]>
  condition: ProfileCommunityAssetRoleConditionRecord
  mintAccountsByAssetGroupId: Map<string, ProfileCommunityMintAccountEntity[]>
  mintAmountsByAssetGroupId: Map<string, bigint>
  traitsByAssetId: Map<string, ProfileCommunityCollectionAssetTraitEntity[]>
}): ProfileCommunityAssetRoleGroupEntity {
  if (input.condition.type === 'collection') {
    return {
      address: input.condition.address,
      id: input.condition.id,
      imageUrl: input.condition.imageUrl,
      label: input.condition.label,
      maximumAmount: input.condition.maximumAmount,
      minimumAmount: input.condition.minimumAmount,
      ownedAssets: (input.collectionAssetsByAssetGroupId.get(input.condition.id) ?? []).map((currentAsset) => ({
        ...currentAsset,
        traits: input.traitsByAssetId.get(currentAsset.id) ?? [],
      })),
      type: 'collection',
    }
  }

  return {
    address: input.condition.address,
    id: input.condition.id,
    imageUrl: input.condition.imageUrl,
    label: input.condition.label,
    maximumAmount: input.condition.maximumAmount,
    minimumAmount: input.condition.minimumAmount,
    ownedAccounts: input.mintAccountsByAssetGroupId.get(input.condition.id) ?? [],
    ownedAmount: (input.mintAmountsByAssetGroupId.get(input.condition.id) ?? 0n).toString(),
    type: 'mint',
  }
}

export async function profileCommunityAssetRolesList(input: { organizationIds: string[]; userId: string }) {
  const roleConditionRecords = await listProfileCommunityAssetRoleConditionRecords(input.organizationIds)
  const assetGroupTypeById = new Map<string, 'collection' | 'mint'>()
  const roleRecordsById = new Map<string, ProfileCommunityAssetRoleRecord>()

  for (const conditionRecord of roleConditionRecords) {
    assetGroupTypeById.set(conditionRecord.id, conditionRecord.type)

    const existingRoleRecord = roleRecordsById.get(conditionRecord.roleId) ?? {
      conditions: [],
      id: conditionRecord.roleId,
      matchMode: conditionRecord.roleMatchMode,
      name: conditionRecord.roleName,
      organizationId: conditionRecord.organizationId,
      slug: conditionRecord.roleSlug,
    }

    existingRoleRecord.conditions.push(conditionRecord)
    roleRecordsById.set(conditionRecord.roleId, existingRoleRecord)
  }

  const assetGroupIds = [...assetGroupTypeById.keys()].sort((left, right) => left.localeCompare(right))
  const walletAddresses = await listProfileSolanaWalletAddresses(input.userId)
  const collectionAssetsByAssetGroupId = new Map<string, ProfileCommunityCollectionAssetEntity[]>()
  const mintAccountsByAssetGroupId = new Map<string, ProfileCommunityMintAccountEntity[]>()
  const mintAmountsByAssetGroupId = new Map<string, bigint>()

  if (assetGroupIds.length > 0 && walletAddresses.length > 0) {
    const ownerExpression = sql<string>`trim(${asset.owner})`
    const visibleLabelExpression = sql<string>`coalesce(nullif(lower(${asset.metadataName}), ''), ${asset.address})`
    const assetRows: ProfileCommunityAssetRow[] = []
    const walletAddressChunkSize = getSqliteChunkSize(2)

    for (const walletAddressChunk of splitIntoChunks(walletAddresses, walletAddressChunkSize)) {
      const assetGroupChunkSize = Math.max(1, getSqliteChunkSize(1) - walletAddressChunk.length)

      for (const assetGroupIdChunk of splitIntoChunks(assetGroupIds, assetGroupChunkSize)) {
        if (assetGroupIdChunk.length === 0 || walletAddressChunk.length === 0) {
          continue
        }

        const chunkAssetRows = await db
          .select({
            address: asset.address,
            amount: asset.amount,
            assetGroupId: asset.assetGroupId,
            id: asset.id,
            metadataImageUrl: asset.metadataImageUrl,
            metadataName: asset.metadataName,
            metadataSymbol: asset.metadataSymbol,
            owner: ownerExpression,
            resolverKind: asset.resolverKind,
            visibleLabel: visibleLabelExpression,
          })
          .from(asset)
          .where(and(inArray(asset.assetGroupId, assetGroupIdChunk), inArray(ownerExpression, walletAddressChunk)))
          .orderBy(asc(visibleLabelExpression), asc(ownerExpression), asc(asset.address), asc(asset.id))

        assetRows.push(...chunkAssetRows)
      }
    }

    assetRows.sort(
      (left, right) =>
        left.visibleLabel.localeCompare(right.visibleLabel) ||
        left.owner.localeCompare(right.owner) ||
        left.address.localeCompare(right.address) ||
        left.id.localeCompare(right.id),
    )

    for (const assetRow of assetRows) {
      const amount = normalizeAmountToBigInt(assetRow.amount)

      if (amount === null || amount <= 0n) {
        continue
      }

      const assetGroupType = assetGroupTypeById.get(assetRow.assetGroupId)

      if (!assetGroupType) {
        continue
      }

      if (assetGroupType === 'collection') {
        if (assetRow.resolverKind !== 'helius-collection-assets') {
          continue
        }

        const existingAssets = collectionAssetsByAssetGroupId.get(assetRow.assetGroupId) ?? []

        existingAssets.push({
          address: assetRow.address,
          amount: assetRow.amount,
          id: assetRow.id,
          metadataImageUrl: assetRow.metadataImageUrl,
          metadataName: assetRow.metadataName,
          metadataSymbol: assetRow.metadataSymbol,
          owner: assetRow.owner,
          traits: [],
        })
        collectionAssetsByAssetGroupId.set(assetRow.assetGroupId, existingAssets)
        continue
      }

      if (assetRow.resolverKind !== 'helius-token-accounts') {
        continue
      }

      const existingAccounts = mintAccountsByAssetGroupId.get(assetRow.assetGroupId) ?? []
      const existingAccountIndex = existingAccounts.findIndex(
        (currentAccount) => currentAccount.owner === assetRow.owner,
      )

      if (existingAccountIndex === -1) {
        existingAccounts.push({
          address: assetRow.address,
          amount: assetRow.amount,
          id: `${assetRow.assetGroupId}:${assetRow.owner}`,
          owner: assetRow.owner,
        })
      } else {
        const existingAccount = existingAccounts[existingAccountIndex]!

        existingAccounts[existingAccountIndex] = {
          ...existingAccount,
          amount: (BigInt(existingAccount.amount) + amount).toString(),
        }
      }

      mintAccountsByAssetGroupId.set(
        assetRow.assetGroupId,
        existingAccounts.sort(
          (left, right) =>
            left.owner.localeCompare(right.owner) ||
            left.address.localeCompare(right.address) ||
            left.id.localeCompare(right.id),
        ),
      )
      mintAmountsByAssetGroupId.set(
        assetRow.assetGroupId,
        (mintAmountsByAssetGroupId.get(assetRow.assetGroupId) ?? 0n) + amount,
      )
    }
  }

  const collectionAssetIds = [...collectionAssetsByAssetGroupId.values()].flat().map((currentAsset) => currentAsset.id)
  const traitsByAssetId = await listProfileCollectionAssetTraits(collectionAssetIds)
  const assetRolesByOrganizationId = new Map<string, ProfileCommunityAssetRoleEntity[]>()

  for (const roleRecord of [...roleRecordsById.values()].sort(compareProfileCommunityAssetRoles)) {
    const matchedConditions = roleRecord.conditions
      .sort(compareProfileCommunityAssetRoleConditions)
      .filter((condition) =>
        isConditionMatched({
          amount: getConditionAmount({
            collectionAssetsByAssetGroupId,
            condition,
            mintAmountsByAssetGroupId,
          }),
          condition,
        }),
      )
    const matchesRole =
      roleRecord.matchMode === 'all'
        ? matchedConditions.length === roleRecord.conditions.length
        : matchedConditions.length > 0

    if (!matchesRole) {
      continue
    }

    const existingAssetRoles = assetRolesByOrganizationId.get(roleRecord.organizationId) ?? []

    assetRolesByOrganizationId.set(roleRecord.organizationId, [
      ...existingAssetRoles,
      {
        assetGroups: matchedConditions.map((condition) =>
          toProfileCommunityAssetRoleGroupEntity({
            collectionAssetsByAssetGroupId,
            condition,
            mintAccountsByAssetGroupId,
            mintAmountsByAssetGroupId,
            traitsByAssetId,
          }),
        ),
        id: roleRecord.id,
        matchMode: roleRecord.matchMode,
        name: roleRecord.name,
        slug: roleRecord.slug,
      },
    ])
  }

  return new Map(
    input.organizationIds.map((organizationId) => [
      organizationId,
      assetRolesByOrganizationId.get(organizationId) ?? [],
    ]),
  )
}
