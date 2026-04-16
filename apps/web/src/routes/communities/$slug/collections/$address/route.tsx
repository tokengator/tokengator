import { Outlet, createFileRoute } from '@tanstack/react-router'

import { getCommunityCollectionAssetsRouteQueryOptions } from '@/features/community/data-access/use-community-collection-assets-query'
import { CommunityFeatureCollectionDetail } from '@/features/community/feature/community-feature-collection-detail'
import { validateCommunityCollectionAssetSearch } from '@/features/community/util/community-collection-asset-search'
import { Route as CommunityRoute } from '@/routes/communities/$slug/route'

export const Route = createFileRoute('/communities/$slug/collections/$address')({
  beforeLoad: async ({ context, params, search }) => {
    const collectionAssets = await context.queryClient.ensureQueryData(
      getCommunityCollectionAssetsRouteQueryOptions({
        address: params.address,
        facets: search.facets,
        owner: search.owner,
        query: search.query,
        slug: params.slug,
      }),
    )

    return { collectionAssets }
  },
  component: RouteComponent,
  validateSearch: validateCommunityCollectionAssetSearch,
})

function RouteComponent() {
  const { collectionAssets } = Route.useRouteContext()
  const { address } = Route.useParams()
  const { community } = CommunityRoute.useRouteContext()
  const search = Route.useSearch()

  if (!community) {
    return null
  }

  return (
    <>
      <CommunityFeatureCollectionDetail
        address={address}
        initialCollectionAssets={collectionAssets}
        initialCommunity={community}
        search={search}
      />
      <Outlet />
    </>
  )
}
