import { useNavigate } from '@tanstack/react-router'
import type {
  CommunityCollectionAssetDetailEntity,
  CommunityCollectionAssetEntity,
  CommunityCollectionEntity,
} from '@tokengator/sdk'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@tokengator/ui/components/accordion'
import { Badge } from '@tokengator/ui/components/badge'
import { Button } from '@tokengator/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { Dialog, DialogContent, DialogTitle } from '@tokengator/ui/components/dialog'
import { UiDebug } from '@tokengator/ui/components/ui-debug'

import type { CommunityCollectionAssetSearch } from '../util/community-collection-asset-search'
import { useCommunityCollectionAssetQuery } from '../data-access/use-community-collection-asset-query'
import {
  getCommunityCollectionAssetNavigation,
  getCommunityCollectionAssetSiblingAddresses,
  getCommunityCollectionNavigation,
} from '../util/community-collection-asset-navigation'

function getCommunityCollectionAssetTitle(asset: CommunityCollectionAssetDetailEntity) {
  return asset.metadataName?.trim() || asset.address
}

function getCommunityCollectionAssetTraitLabel(trait: CommunityCollectionAssetDetailEntity['traits'][number]) {
  return `${trait.groupLabel}: ${trait.valueLabel}`
}

export function CommunityCollectionAssetDialogContent({
  asset,
  assetAddress,
  assets,
  onClose,
  onNavigateToAsset,
  selectedCollection,
}: {
  asset: CommunityCollectionAssetDetailEntity
  assetAddress: string
  assets: CommunityCollectionAssetEntity[]
  onClose: () => void
  onNavigateToAsset: (assetAddress: string) => void
  selectedCollection: CommunityCollectionEntity
}) {
  const { nextAssetAddress, previousAssetAddress } = getCommunityCollectionAssetSiblingAddresses({
    asset: assetAddress,
    assets,
  })

  return (
    <>
      <div className="grid gap-1">
        <h2 className="font-heading text-sm font-medium">{getCommunityCollectionAssetTitle(asset)}</h2>
        <p className="text-muted-foreground text-xs/relaxed">{selectedCollection.label}</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button
          disabled={!previousAssetAddress}
          onClick={() => previousAssetAddress && onNavigateToAsset(previousAssetAddress)}
          type="button"
          variant="outline"
        >
          <ChevronLeftIcon />
          Previous
        </Button>
        <Button onClick={onClose} type="button" variant="outline">
          Back to collection
        </Button>
        <Button
          disabled={!nextAssetAddress}
          onClick={() => nextAssetAddress && onNavigateToAsset(nextAssetAddress)}
          type="button"
          variant="outline"
        >
          Next
          <ChevronRightIcon />
        </Button>
      </div>
      {!previousAssetAddress &&
      !nextAssetAddress &&
      !assets.some((currentAsset) => currentAsset.address === assetAddress) ? (
        <div className="text-muted-foreground text-xs">
          This asset is not in the current filtered grid, so previous and next navigation is unavailable.
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardContent className="grid gap-4 p-4">
            {asset.metadataImageUrl ? (
              <img
                alt={getCommunityCollectionAssetTitle(asset)}
                className="bg-muted aspect-square w-full rounded-md border object-cover"
                loading="lazy"
                src={asset.metadataImageUrl}
              />
            ) : (
              <div
                aria-label={`${getCommunityCollectionAssetTitle(asset)} image placeholder`}
                className="bg-muted aspect-square w-full rounded-md border"
                role="img"
              />
            )}
          </CardContent>
        </Card>
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Owner</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <div className="font-medium">{asset.owner}</div>
              <div className="text-muted-foreground text-xs">
                Owner profile placeholder. Additional profile data is not available yet.
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Traits</CardTitle>
            </CardHeader>
            <CardContent>
              {asset.traits.length ? (
                <div className="flex flex-wrap gap-2">
                  {asset.traits.map((trait) => (
                    <Badge key={`${trait.groupId}:${trait.value}`} variant="outline">
                      {getCommunityCollectionAssetTraitLabel(trait)}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">No traits</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <div>
                <div className="text-muted-foreground text-xs">Asset</div>
                <div className="font-mono break-all">{asset.address}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Collection</div>
                <div>{selectedCollection.label}</div>
                <div className="text-muted-foreground font-mono text-xs break-all">{selectedCollection.address}</div>
              </div>
              {asset.metadataSymbol ? (
                <div>
                  <div className="text-muted-foreground text-xs">Symbol</div>
                  <div>{asset.metadataSymbol}</div>
                </div>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Accordion className="rounded-none border-0">
                <AccordionItem value="json-metadata">
                  <AccordionTrigger>JSON Metadata</AccordionTrigger>
                  <AccordionContent className="grid gap-3 pb-2 text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs">Metadata URL</div>
                      <div className="font-mono break-all">{asset.metadataJsonUrl ?? 'No metadata URL available'}</div>
                    </div>
                    {asset.metadataJson ? (
                      <UiDebug className="bg-muted max-h-80 rounded-md border p-3 text-xs" data={asset.metadataJson} />
                    ) : (
                      <div className="text-muted-foreground text-sm">No indexed JSON metadata available yet.</div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

export function CommunityFeatureCollectionAssetDialog({
  assetAddress,
  assets,
  initialCollectionAsset,
  search,
  selectedCollection,
  slug,
}: {
  assetAddress: string
  assets: CommunityCollectionAssetEntity[]
  initialCollectionAsset: CommunityCollectionAssetDetailEntity
  search: CommunityCollectionAssetSearch
  selectedCollection: CommunityCollectionEntity
  slug: string
}) {
  const collectionAsset = useCommunityCollectionAssetQuery(
    {
      address: selectedCollection.address,
      asset: assetAddress,
      slug,
    },
    {
      initialData: initialCollectionAsset,
    },
  )
  const navigate = useNavigate()
  const dialogTitle = collectionAsset.data ? getCommunityCollectionAssetTitle(collectionAsset.data) : 'Asset details'

  function handleClose() {
    void navigate(
      getCommunityCollectionNavigation({
        address: selectedCollection.address,
        search,
        slug,
      }),
    )
  }

  function handleNavigateToAsset(nextAsset: string) {
    void navigate(
      getCommunityCollectionAssetNavigation({
        address: selectedCollection.address,
        asset: nextAsset,
        search,
        slug,
      }),
    )
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          handleClose()
        }
      }}
      open
    >
      <DialogContent className="sm:max-w-6xl">
        <DialogTitle className="sr-only">{dialogTitle}</DialogTitle>
        {collectionAsset.error ? <div className="text-destructive text-sm">{collectionAsset.error.message}</div> : null}
        {collectionAsset.isPending && !collectionAsset.data ? (
          <div className="text-muted-foreground text-sm">Loading asset...</div>
        ) : null}
        {collectionAsset.data ? (
          <CommunityCollectionAssetDialogContent
            asset={collectionAsset.data}
            assetAddress={assetAddress}
            assets={assets}
            onClose={handleClose}
            onNavigateToAsset={handleNavigateToAsset}
            selectedCollection={selectedCollection}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
