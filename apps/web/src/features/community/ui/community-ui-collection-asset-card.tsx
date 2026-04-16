import { Link } from '@tanstack/react-router'
import type { CommunityCollectionAssetEntity } from '@tokengator/sdk'

import type { CommunityCollectionAssetNavigation } from '../util/community-collection-asset-navigation'

function getCommunityCollectionAssetTitle(asset: CommunityCollectionAssetEntity) {
  return asset.metadataName?.trim() || asset.address
}

export function CommunityUiCollectionAssetCard({
  asset,
  navigation,
}: {
  asset: CommunityCollectionAssetEntity
  navigation?: CommunityCollectionAssetNavigation
}) {
  const title = getCommunityCollectionAssetTitle(asset)
  const content = (
    <div className="bg-card overflow-hidden rounded-lg border">
      {asset.metadataImageUrl ? (
        <img alt={title} className="aspect-square w-full object-cover" loading="lazy" src={asset.metadataImageUrl} />
      ) : (
        <div className="bg-muted aspect-square w-full" />
      )}
      <div className="flex items-center justify-center p-3 text-center text-sm">
        <div className="line-clamp-2 font-medium">{title}</div>
      </div>
    </div>
  )

  if (!navigation) {
    return content
  }

  return (
    <Link className="block" params={navigation.params} search={navigation.search} to={navigation.to}>
      {content}
    </Link>
  )
}
