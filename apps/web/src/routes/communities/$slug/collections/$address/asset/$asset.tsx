import { createFileRoute } from '@tanstack/react-router'

import { getCommunityCollectionAssetRouteQueryOptions } from '@/features/community/data-access/use-community-collection-asset-query'
import { CommunityFeatureCollectionAssetDialog } from '@/features/community/feature/community-feature-collection-asset-dialog'
import { Route as CollectionRoute } from '@/routes/communities/$slug/collections/$address/route'
import { Route as CommunityRoute } from '@/routes/communities/$slug/route'

export const Route = createFileRoute('/communities/$slug/collections/$address/asset/$asset')({
  beforeLoad: async ({ context, params }) => {
    const collectionAsset = await context.queryClient.ensureQueryData(
      getCommunityCollectionAssetRouteQueryOptions({
        address: params.address,
        asset: params.asset,
        slug: params.slug,
      }),
    )

    return { collectionAsset }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { collectionAsset: routeCollectionAsset } = Route.useRouteContext()
  const { asset } = Route.useParams()
  const { community } = CommunityRoute.useRouteContext()
  const { collectionAssets } = CollectionRoute.useRouteContext()
  const { address } = CollectionRoute.useParams()
  const search = CollectionRoute.useSearch()

  if (!community) {
    return null
  }

  const selectedCollection = community.collections.find((collection) => collection.address === address)

  if (!selectedCollection) {
    return null
  }

  return (
    <CommunityFeatureCollectionAssetDialog
      assetAddress={asset}
      assets={collectionAssets?.assets ?? []}
      initialCollectionAsset={routeCollectionAsset}
      search={search}
      selectedCollection={selectedCollection}
      slug={community.slug}
    />
  )
}
