import { communityGetBySlugForUser } from './community-get-by-slug-for-user'
import type { CommunityGetBySlugResult, CommunityRoleAssetGroupEntity } from './community.entity'

type CommunityMarketplaceCollectionLookup =
  | {
      assetGroup: CommunityRoleAssetGroupEntity
      community: CommunityGetBySlugResult
      status: 'ok'
    }
  | {
      assetGroup: CommunityRoleAssetGroupEntity | null
      community: CommunityGetBySlugResult | null
      message: string
      status: 'collection-not-found' | 'community-not-found' | 'purchase-unavailable'
    }

export async function communityGetMarketplaceCollectionForUser(input: {
  assetGroupId: string
  slug: string
  userId: string
}): Promise<CommunityMarketplaceCollectionLookup> {
  const community = await communityGetBySlugForUser({
    slug: input.slug,
    userId: input.userId,
  })

  if (!community) {
    return {
      assetGroup: null,
      community: null,
      message: 'Community not found.',
      status: 'community-not-found',
    }
  }

  const collection = community.collections.find((entry) => entry.id === input.assetGroupId) ?? null
  const assetGroup =
    community.roles
      .flatMap((role) => role.assetGroups)
      .find((entry) => entry.id === input.assetGroupId && entry.type === 'collection') ?? null

  if (!collection || !assetGroup) {
    return {
      assetGroup: null,
      community,
      message: 'Community collection not found.',
      status: 'collection-not-found',
    }
  }

  if (!collection.assetMarketplace.enabled) {
    return {
      assetGroup,
      community,
      message:
        collection.assetMarketplace.unavailableReason === 'missing-symbol'
          ? 'This community collection is missing a Magic Eden symbol.'
          : 'This community collection is not available for marketplace purchases.',
      status: 'purchase-unavailable',
    }
  }

  return {
    assetGroup,
    community,
    status: 'ok',
  }
}
