import type { CommunityCollectionAssetEntity } from '@tokengator/sdk'

function getCommunityCollectionAssetTitle(asset: CommunityCollectionAssetEntity) {
  return asset.metadataName?.trim() || asset.address
}

export function CommunityUiCollectionAssetCard({ asset }: { asset: CommunityCollectionAssetEntity }) {
  const title = getCommunityCollectionAssetTitle(asset)

  return (
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
}
