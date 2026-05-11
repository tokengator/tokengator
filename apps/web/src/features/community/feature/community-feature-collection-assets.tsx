import { useNavigate } from '@tanstack/react-router'
import { useDeferredValue, useEffect, useState } from 'react'
import type { CommunityCollectionEntity, CommunityListCollectionAssetsResult } from '@tokengator/sdk'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import type { UiFacetFilterGroup } from '@tokengator/ui/components/ui-facet-filter'

import { useCommunityCollectionAssetsQuery } from '../data-access/use-community-collection-assets-query'
import { useCommunityCollectionOwnerCandidatesQuery } from '../data-access/use-community-collection-owner-candidates-query'
import { CommunityUiCollectionAssetBrowserControls } from '../ui/community-ui-collection-asset-browser-controls'
import { CommunityUiCollectionAssetGrid } from '../ui/community-ui-collection-asset-grid'
import { getCommunityCollectionAssetNavigation } from '../util/community-collection-asset-navigation'
import type { CommunityCollectionAssetSearch } from '../util/community-collection-asset-search'

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

export function CommunityFeatureCollectionAssets({
  initialCollectionAssets,
  search,
  selectedCollection,
  slug,
}: {
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
  const [isOwnerComboboxOpen, setIsOwnerComboboxOpen] = useState(false)
  const [ownerDraftSearch, setOwnerDraftSearch] = useState(search.owner ?? '')
  const deferredOwnerDraftSearch = useDeferredValue(ownerDraftSearch)
  const normalizedOwnerDraftSearch = deferredOwnerDraftSearch.trim()
  const ownerCandidates = useCommunityCollectionOwnerCandidatesQuery({
    enabled: isOwnerComboboxOpen,
    search: normalizedOwnerDraftSearch || undefined,
  })
  const facetGroups = getCommunityCollectionFacetGroups(
    collectionAssets.data?.facetTotals ?? selectedCollection.facetTotals,
  )

  useEffect(() => {
    setOwnerDraftSearch(search.owner ?? '')
  }, [search.owner])

  if (!collectionAssets.data && !collectionAssets.error && !collectionAssets.isPending) {
    return <CommunityCollectionAssetNotFoundCard />
  }

  return (
    <Card>
      <CardContent className="grid gap-6">
        <CommunityUiCollectionAssetBrowserControls
          facetGroups={facetGroups}
          grid={search.grid}
          initialFacets={search.facets ?? {}}
          initialOwner={search.owner ?? ''}
          initialQuery={search.query ?? ''}
          isOwnerCandidatesPending={ownerCandidates.isPending}
          isOwnerComboboxOpen={isOwnerComboboxOpen}
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
          onOwnerComboboxOpenChange={setIsOwnerComboboxOpen}
          onOwnerCommit={(owner) => {
            void navigate({
              params: {
                address: selectedCollection.address,
                slug,
              },
              search: {
                facets: search.facets,
                grid: search.grid,
                owner: owner.trim() || undefined,
                query: search.query,
              },
              to: '/communities/$slug/collections/$address',
            })
          }}
          onOwnerDraftChange={setOwnerDraftSearch}
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
          ownerCandidates={ownerCandidates.data ?? []}
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
  )
}
