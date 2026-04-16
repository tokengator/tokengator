import type { CommunityCollectionAssetEntity } from '@tokengator/sdk'

import { Skeleton } from '@tokengator/ui/components/skeleton'
import { cn } from '@tokengator/ui/lib/utils'

import type { CommunityCollectionAssetNavigation } from '../util/community-collection-asset-navigation'
import type { CommunityCollectionAssetGrid } from '../util/community-collection-asset-search'

import { CommunityUiCollectionAssetCard } from './community-ui-collection-asset-card'

function getCommunityCollectionAssetGridClassName(grid: CommunityCollectionAssetGrid) {
  switch (grid) {
    case 8:
      return 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8'
    case 12:
      return 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12'
    case 4:
    default:
      return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
  }
}

export function CommunityUiCollectionAssetGrid({
  assets,
  getAssetNavigation,
  grid,
  isPending,
}: {
  assets: CommunityCollectionAssetEntity[]
  getAssetNavigation?: (asset: CommunityCollectionAssetEntity) => CommunityCollectionAssetNavigation
  grid: CommunityCollectionAssetGrid
  isPending: boolean
}) {
  const gridClassName = getCommunityCollectionAssetGridClassName(grid)

  if (isPending) {
    return (
      <div className={cn('grid gap-4', gridClassName)}>
        {Array.from({
          length: grid,
        }).map((_, index) => (
          <div className="bg-card overflow-hidden rounded-lg border" key={index}>
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="grid gap-2 p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!assets.length) {
    return (
      <div className="border p-6">
        <div className="font-medium">No assets found</div>
        <div className="text-muted-foreground text-sm">Adjust the collection browser filters and try again.</div>
      </div>
    )
  }

  return (
    <div className={cn('grid gap-4', gridClassName)}>
      {assets.map((asset) => (
        <CommunityUiCollectionAssetCard asset={asset} key={asset.id} navigation={getAssetNavigation?.(asset)} />
      ))}
    </div>
  )
}
