import { useNavigate } from '@tanstack/react-router'
import type {
  CommunityCollectionEntity,
  CommunityGetBySlugResult,
  CommunityListCollectionAssetsResult,
} from '@tokengator/sdk'

import type { UiFacetFilterGroup } from '@tokengator/ui/components/ui-facet-filter'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

import type { CommunityCollectionAssetSearch } from '../util/community-collection-asset-search'
import { useCommunityCollectionAssetsQuery } from '../data-access/use-community-collection-assets-query'
import { CommunityUiCollectionAssetBrowserControls } from '../ui/community-ui-collection-asset-browser-controls'
import { CommunityUiCollectionAssetGrid } from '../ui/community-ui-collection-asset-grid'
import { CommunityUiCollectionCombobox } from '../ui/community-ui-collection-combobox'
import { getCommunityCollectionAssetNavigation } from '../util/community-collection-asset-navigation'

function CommunityCollectionAssetNotFoundCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Collection Not Found</CardTitle>
        <CardDescription>The requested collection could not be loaded for this community.</CardDescription>
      </CardHeader>
    </Card>
  )
}

function getCommunityCollectionFacetGroups(
  facetTotals: CommunityCollectionEntity['facetTotals'],
): UiFacetFilterGroup[] {
  return Object.entries(facetTotals)
    .sort(([leftGroupId], [rightGroupId]) => leftGroupId.localeCompare(rightGroupId))
    .map(([groupId, group]) => ({
      id: groupId,
      label: group.label,
      meta: group.total,
      options: Object.entries(group.options)
        .sort(([leftValue], [rightValue]) => leftValue.localeCompare(rightValue))
        .map(([value, option]) => ({
          disabled: option.total === 0,
          label: option.label,
          meta: option.total,
          value,
        })),
    }))
}

export function getCommunityCollectionSwitchNavigation(args: {
  address: string
  search: CommunityCollectionAssetSearch
  slug: string
}) {
  return {
    params: {
      address: args.address,
      slug: args.slug,
    },
    search: {
      facets: undefined,
      grid: args.search.grid,
      owner: args.search.owner,
      query: undefined,
    },
    to: '/communities/$slug/collections/$address' as const,
  }
}

export function CommunityFeatureCollectionAssets({
  collections,
  initialCollectionAssets,
  search,
  selectedCollection,
  slug,
}: {
  collections: CommunityGetBySlugResult['collections']
  initialCollectionAssets: CommunityListCollectionAssetsResult | null
  search: CommunityCollectionAssetSearch
  selectedCollection: CommunityCollectionEntity
  slug: string
}) {
  const collectionAssets = useCommunityCollectionAssetsQuery(
    {
      address: selectedCollection.address,
      facets: search.facets,
      owner: search.owner,
      query: search.query,
      slug,
    },
    {
      initialData: initialCollectionAssets,
    },
  )
  const navigate = useNavigate()
  const facetGroups = getCommunityCollectionFacetGroups(
    collectionAssets.data?.facetTotals ?? selectedCollection.facetTotals,
  )

  if (!collectionAssets.data && !collectionAssets.error && !collectionAssets.isPending) {
    return <CommunityCollectionAssetNotFoundCard />
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CommunityUiCollectionCombobox
            collections={collections}
            onCollectionChange={(address) => {
              void navigate(getCommunityCollectionSwitchNavigation({ address, search, slug }))
            }}
            selectedCollectionAddress={selectedCollection.address}
          />
        </CardHeader>
        <CardContent className="grid gap-6">
          <CommunityUiCollectionAssetBrowserControls
            facetGroups={facetGroups}
            grid={search.grid}
            initialFacets={search.facets ?? {}}
            initialOwner={search.owner ?? ''}
            initialQuery={search.query ?? ''}
            onApply={(values) => {
              void navigate({
                params: {
                  address: selectedCollection.address,
                  slug,
                },
                search: {
                  facets: Object.keys(values.facets).length > 0 ? values.facets : undefined,
                  grid: search.grid,
                  owner: values.owner.trim() || undefined,
                  query: values.query.trim() || undefined,
                },
                to: '/communities/$slug/collections/$address',
              })
            }}
            onGridChange={(grid) => {
              void navigate({
                params: {
                  address: selectedCollection.address,
                  slug,
                },
                search: {
                  facets: search.facets,
                  grid,
                  owner: search.owner,
                  query: search.query,
                },
                to: '/communities/$slug/collections/$address',
              })
            }}
            onReset={() => {
              void navigate({
                params: {
                  address: selectedCollection.address,
                  slug,
                },
                search: {
                  facets: undefined,
                  grid: search.grid,
                  owner: undefined,
                  query: undefined,
                },
                to: '/communities/$slug/collections/$address',
              })
            }}
          />
          {collectionAssets.error ? (
            <div className="text-destructive text-sm">{collectionAssets.error.message}</div>
          ) : null}
          <CommunityUiCollectionAssetGrid
            assets={collectionAssets.data?.assets ?? []}
            getAssetNavigation={(asset) =>
              getCommunityCollectionAssetNavigation({
                address: selectedCollection.address,
                asset: asset.address,
                search,
                slug,
              })
            }
            grid={search.grid}
            isPending={collectionAssets.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}
