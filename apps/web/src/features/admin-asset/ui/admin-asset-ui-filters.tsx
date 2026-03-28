import { useEffect, useState } from 'react'
import { Button } from '@tokengator/ui/components/button'
import { Input } from '@tokengator/ui/components/input'

export interface AdminAssetFiltersValues {
  address: string
  owner: string
  resolverKind: '' | 'helius-collection-assets' | 'helius-token-accounts'
}

interface AdminAssetUiFiltersProps {
  initialValues: AdminAssetFiltersValues
  onApply: (values: AdminAssetFiltersValues) => void
  onReset: () => void
}

export function AdminAssetUiFilters(props: AdminAssetUiFiltersProps) {
  const { initialValues, onApply, onReset } = props
  const [values, setValues] = useState(initialValues)

  useEffect(() => {
    setValues(initialValues)
  }, [initialValues])

  return (
    <div className="flex flex-col gap-3 border p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="grid gap-1.5">
          <label className="text-sm" htmlFor="asset-owner-filter">
            Owner
          </label>
          <Input
            id="asset-owner-filter"
            onChange={(event) =>
              setValues((currentValues) => ({
                ...currentValues,
                owner: event.target.value,
              }))
            }
            placeholder="Filter by owner"
            value={values.owner}
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-sm" htmlFor="asset-address-filter">
            Address
          </label>
          <Input
            id="asset-address-filter"
            onChange={(event) =>
              setValues((currentValues) => ({
                ...currentValues,
                address: event.target.value,
              }))
            }
            placeholder="Filter by address"
            value={values.address}
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-sm" htmlFor="asset-resolver-filter">
            Resolver Kind
          </label>
          <select
            className="bg-background border px-2 py-1 text-sm"
            id="asset-resolver-filter"
            onChange={(event) =>
              setValues((currentValues) => ({
                ...currentValues,
                resolverKind: event.target.value as AdminAssetFiltersValues['resolverKind'],
              }))
            }
            value={values.resolverKind}
          >
            <option value="">all</option>
            <option value="helius-collection-assets">helius-collection-assets</option>
            <option value="helius-token-accounts">helius-token-accounts</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          onClick={() => {
            const resetValues = {
              address: '',
              owner: '',
              resolverKind: '',
            } satisfies AdminAssetFiltersValues

            setValues(resetValues)
            onReset()
          }}
          type="button"
          variant="outline"
        >
          Reset
        </Button>
        <Button onClick={() => onApply(values)} type="button">
          Apply
        </Button>
      </div>
    </div>
  )
}
