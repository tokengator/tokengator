import { useState } from 'react'
import { Button } from '@tokengator/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { Input } from '@tokengator/ui/components/input'
import { UiDebug } from '@tokengator/ui/components/ui-debug'

interface DevUiAssetGroupLookupCardProps {
  data: unknown
  errorMessage: string | null
  isPending: boolean
  lookupAssetGroup: (address: string) => void
  suggestion?: {
    address: string | null
    decimals: number
    imageUrl: string | null
    label: string | null
    reason: string
    resolvable: boolean
    resolverKind: string | null
    symbol: string | null
    type: string | null
  }
  warnings: string[]
}

export function DevUiAssetGroupLookupCard(props: DevUiAssetGroupLookupCardProps) {
  const { data, errorMessage, isPending, lookupAssetGroup, suggestion, warnings } = props
  const [address, setAddress] = useState('')
  const canLookup = address.trim().length > 0

  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle>Asset Group Lookup</CardTitle>
        <CardDescription>
          Looks up a Solana account and recommends an asset group target when an existing resolver can index it.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <form
          className="grid gap-3 md:grid-cols-[1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault()

            if (!canLookup || isPending) {
              return
            }

            lookupAssetGroup(address)
          }}
        >
          <Input
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Solana account address"
            value={address}
          />
          <Button disabled={!canLookup || isPending} type="submit">
            {isPending ? 'Looking up...' : 'Lookup'}
          </Button>
        </form>

        {errorMessage ? <div className="text-destructive text-sm">{errorMessage}</div> : null}

        {suggestion ? (
          <div className="rounded-md border p-3">
            <div className="flex gap-3">
              {suggestion.imageUrl ? (
                <img
                  alt={suggestion.label ?? suggestion.address ?? 'Asset group'}
                  className="size-16 shrink-0 rounded-md border object-cover"
                  loading="lazy"
                  src={suggestion.imageUrl}
                />
              ) : null}
              <div className="min-w-0">
                <div className="font-medium">{suggestion.resolvable ? 'Resolvable' : 'Not resolvable'}</div>
                {suggestion.label ? (
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <div>{suggestion.label}</div>
                    {suggestion.symbol ? (
                      <div className="text-muted-foreground text-xs font-normal">${suggestion.symbol}</div>
                    ) : null}
                  </div>
                ) : null}
                <div className="text-muted-foreground text-sm break-all">
                  {suggestion.resolvable
                    ? `${suggestion.type} / ${suggestion.address} / ${suggestion.resolverKind} / decimals ${suggestion.decimals}`
                    : suggestion.reason}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">Submit an account to preview resolver support.</div>
        )}

        {warnings.length ? (
          <div className="text-muted-foreground text-sm">
            {warnings.map((warning) => (
              <div key={warning}>{warning}</div>
            ))}
          </div>
        ) : null}

        {data ? <UiDebug className="bg-muted/50 rounded-md p-3" data={data} /> : null}
      </CardContent>
    </Card>
  )
}
