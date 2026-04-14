import type { CommunityGetBySlugResult, CommunityListCollectionAssetsResult } from '@tokengator/sdk'

import { Card, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

import type { CommunityCollectionAssetSearch } from '../util/community-collection-asset-search'

import { CommunityFeatureCollectionAssets } from './community-feature-collection-assets'

export function CommunityFeatureCollectionDetail({
  address,
  initialCollectionAssets,
  initialCommunity,
  search,
}: {
  address: string
  initialCollectionAssets: CommunityListCollectionAssetsResult | null
  initialCommunity: CommunityGetBySlugResult
  search: CommunityCollectionAssetSearch
}) {
  const selectedCollection = initialCommunity.collections.find((collection) => collection.address === address)

  if (!selectedCollection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Collection Not Found</CardTitle>
          <CardDescription>The requested collection is not linked to this community.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <CommunityFeatureCollectionAssets
      collections={initialCommunity.collections}
      initialCollectionAssets={initialCollectionAssets}
      search={search}
      selectedCollection={selectedCollection}
      slug={initialCommunity.slug}
    />
  )
}
