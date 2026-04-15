import { Loader2, Search } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@tokengator/ui/components/button'
import { Input } from '@tokengator/ui/components/input'
import { Label } from '@tokengator/ui/components/label'

interface AdminAssetGroupUiCreateAddressFormProps {
  errorMessage: string | null
  isPending: boolean
  lookupAssetGroup: (address: string) => void
}

export function AdminAssetGroupUiCreateAddressForm(props: AdminAssetGroupUiCreateAddressFormProps) {
  const { errorMessage, isPending, lookupAssetGroup } = props
  const [address, setAddress] = useState('')
  const canLookup = address.trim().length > 0

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault()

        if (!canLookup || isPending) {
          return
        }

        lookupAssetGroup(address)
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="asset-group-create-address">Address</Label>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Input
            id="asset-group-create-address"
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Collection, mint, or asset address"
            required
            value={address}
          />
          <Button disabled={!canLookup || isPending} type="submit">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            {isPending ? 'Looking up' : 'Lookup'}
          </Button>
        </div>
      </div>

      {errorMessage ? <div className="text-destructive text-sm">{errorMessage}</div> : null}
    </form>
  )
}
