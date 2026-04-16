import { AlertTriangle, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react'
import type { AdminAssetGroupLookupResult } from '@tokengator/sdk'
import { Badge } from '@tokengator/ui/components/badge'
import { Button } from '@tokengator/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { UiInfoCard, UiInfoCardLabel, UiInfoCardValue } from '@tokengator/ui/components/ui-info-card'

import { ellipsifyAddress } from '../util/ellipsify-address'

interface AdminAssetGroupUiCreatePreviewProps {
  isCreating: boolean
  isLookupPending: boolean
  isUpdating: boolean
  lookup: AdminAssetGroupLookupResult
  onConfirm: () => void
  onOpenExisting: (assetGroupId: string) => void
  onUpdateMetadata: () => void
}

export function AdminAssetGroupUiCreatePreview(props: AdminAssetGroupUiCreatePreviewProps) {
  const { isCreating, isLookupPending, isUpdating, lookup, onConfirm, onOpenExisting, onUpdateMetadata } = props
  const existingAssetGroup = lookup.existingAssetGroup
  const { suggestion, warnings } = lookup
  const canCreate = suggestion.resolvable && Boolean(suggestion.address && suggestion.type)
  const hasDecimalsUpdate = Boolean(existingAssetGroup && existingAssetGroup.decimals !== suggestion.decimals)
  const hasImageUrlUpdate = Boolean(existingAssetGroup && existingAssetGroup.imageUrl !== suggestion.imageUrl)
  const hasSymbolUpdate = Boolean(existingAssetGroup && existingAssetGroup.symbol !== suggestion.symbol)
  const suggestedLabel = suggestion.label?.trim() || (suggestion.address ? ellipsifyAddress(suggestion.address) : '')
  const hasLabelOrTypeUpdate = Boolean(
    existingAssetGroup &&
    suggestion.type &&
    (existingAssetGroup.label !== suggestedLabel || existingAssetGroup.type !== suggestion.type),
  )
  const hasMetadataUpdate =
    canCreate &&
    Boolean(
      existingAssetGroup &&
      suggestion.type &&
      (hasDecimalsUpdate || hasImageUrlUpdate || hasLabelOrTypeUpdate || hasSymbolUpdate),
    )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview</CardTitle>
        <CardDescription>Confirm the resolved asset group before creating it.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex gap-3">
          {suggestion.imageUrl ? (
            <img
              alt={suggestion.label ?? suggestion.address ?? 'Asset group'}
              className="size-20 shrink-0 rounded-md border object-cover"
              loading="lazy"
              src={suggestion.imageUrl}
            />
          ) : null}
          <div className="min-w-0 space-y-2">
            <Badge variant={canCreate ? 'secondary' : 'destructive'}>
              {canCreate ? 'Resolvable' : 'Not resolvable'}
            </Badge>
            <div>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <div className="font-medium break-words">
                  {suggestion.label ?? suggestion.address ?? formatLookupReason(suggestion.reason)}
                </div>
                {suggestion.symbol ? (
                  <div className="text-muted-foreground text-xs font-normal">${suggestion.symbol}</div>
                ) : null}
              </div>
              <div className="text-muted-foreground font-mono text-xs break-all">{lookup.account}</div>
            </div>
          </div>
        </div>

        {canCreate ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <UiInfoCard>
              <UiInfoCardLabel>Address</UiInfoCardLabel>
              <UiInfoCardValue className="font-mono text-xs break-all">{suggestion.address}</UiInfoCardValue>
            </UiInfoCard>
            <UiInfoCard>
              <UiInfoCardLabel>Decimals</UiInfoCardLabel>
              <UiInfoCardValue>{suggestion.decimals}</UiInfoCardValue>
            </UiInfoCard>
            <UiInfoCard>
              <UiInfoCardLabel>Resolver</UiInfoCardLabel>
              <UiInfoCardValue className="font-mono text-xs break-all">{suggestion.resolverKind}</UiInfoCardValue>
            </UiInfoCard>
            <UiInfoCard>
              <UiInfoCardLabel>Symbol</UiInfoCardLabel>
              <UiInfoCardValue>{suggestion.symbol ?? 'None'}</UiInfoCardValue>
            </UiInfoCard>
            <UiInfoCard>
              <UiInfoCardLabel>Type</UiInfoCardLabel>
              <UiInfoCardValue>{suggestion.type}</UiInfoCardValue>
            </UiInfoCard>
          </div>
        ) : (
          <div className="text-muted-foreground rounded-md border p-3 text-sm">
            {formatLookupReason(suggestion.reason)}
          </div>
        )}

        {existingAssetGroup ? (
          <div className="border-destructive/30 bg-destructive/5 rounded-md border p-3 text-sm">
            <div className="flex gap-2">
              <AlertTriangle className="text-destructive mt-0.5 size-4 shrink-0" />
              <div className="grid gap-2">
                <div className="font-medium">Asset group already exists</div>
                <div className="text-muted-foreground">
                  {existingAssetGroup.label} already uses this address. Creating a duplicate is disabled.
                </div>
                {hasLabelOrTypeUpdate ? (
                  <div className="text-muted-foreground">
                    Lookup metadata differs from the existing record. Current: {existingAssetGroup.type} /{' '}
                    {existingAssetGroup.label}. Suggested: {suggestion.type} / {suggestedLabel}.
                  </div>
                ) : null}
                {hasDecimalsUpdate ? (
                  <div className="text-muted-foreground">
                    Decimals: current {existingAssetGroup.decimals}, suggested {suggestion.decimals}.
                  </div>
                ) : null}
                {hasSymbolUpdate ? (
                  <div className="text-muted-foreground">
                    Symbol: current {existingAssetGroup.symbol ?? 'none'}, suggested {suggestion.symbol ?? 'none'}.
                  </div>
                ) : null}
                {hasImageUrlUpdate ? (
                  <div className="text-muted-foreground">
                    Image: current {existingAssetGroup.imageUrl ? 'set' : 'none'}, suggested{' '}
                    {suggestion.imageUrl ? 'set' : 'none'}.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {warnings.length ? (
          <div className="text-muted-foreground text-sm">
            {warnings.map((warning) => (
              <div key={warning}>{warning}</div>
            ))}
          </div>
        ) : null}

        <div className="flex justify-end">
          {existingAssetGroup ? (
            <div className="flex flex-wrap justify-end gap-2">
              {hasMetadataUpdate ? (
                <Button disabled={isLookupPending || isUpdating} onClick={onUpdateMetadata} type="button">
                  {isUpdating ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  Update Metadata
                </Button>
              ) : null}
              <Button onClick={() => onOpenExisting(existingAssetGroup.id)} type="button" variant="outline">
                <ExternalLink className="size-4" />
                View Asset Group
              </Button>
            </div>
          ) : (
            <Button disabled={!canCreate || isCreating || isLookupPending} onClick={onConfirm} type="button">
              {isCreating ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Create Asset Group
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function formatLookupReason(reason: string) {
  return reason.replaceAll('_', ' ')
}
