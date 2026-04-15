import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { AdminAssetGroupUpdateInput } from '@tokengator/sdk'
import { Button } from '@tokengator/ui/components/button'
import { Checkbox } from '@tokengator/ui/components/checkbox'
import { Input } from '@tokengator/ui/components/input'
import { Label } from '@tokengator/ui/components/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@tokengator/ui/components/select'

import { ellipsifyAddress } from '../util/ellipsify-address'

interface AdminAssetGroupUiFormProps {
  initialValues: AdminAssetGroupUpdateInput['data']
  isPending: boolean
  onSubmit: (values: AdminAssetGroupUpdateInput['data']) => void
  showEnabled?: boolean
  submitLabel: string
}

export function AdminAssetGroupUiForm(props: AdminAssetGroupUiFormProps) {
  const { initialValues, isPending, onSubmit, showEnabled = true, submitLabel } = props
  const [values, setValues] = useState(initialValues)
  const fallbackLabel = ellipsifyAddress(values.address)

  useEffect(() => {
    setValues(initialValues)
  }, [initialValues])

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        const address = values.address.trim()

        onSubmit({
          ...values,
          address,
          imageUrl: values.imageUrl?.trim() || null,
          label: values.label.trim() || ellipsifyAddress(address),
        })
      }}
    >
      <div className="grid gap-1.5">
        <Label id="asset-group-type-label">Type</Label>
        <Select
          disabled={isPending}
          onValueChange={(value) => {
            if (value === null) {
              return
            }

            setValues((currentValues) => ({
              ...currentValues,
              type: value as AdminAssetGroupUpdateInput['data']['type'],
            }))
          }}
          value={values.type}
        >
          <SelectTrigger aria-labelledby="asset-group-type-label" className="w-full" id="asset-group-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="collection">collection</SelectItem>
            <SelectItem value="mint">mint</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="asset-group-address">Address</Label>
        <Input
          id="asset-group-address"
          onChange={(event) =>
            setValues((currentValues) => ({
              ...currentValues,
              address: event.target.value,
              label:
                !currentValues.label.trim() || currentValues.label.trim() === ellipsifyAddress(currentValues.address)
                  ? ellipsifyAddress(event.target.value)
                  : currentValues.label,
            }))
          }
          placeholder="Collection or mint address"
          required
          value={values.address}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="asset-group-image-url">Image URL</Label>
        <Input
          id="asset-group-image-url"
          onChange={(event) =>
            setValues((currentValues) => ({
              ...currentValues,
              imageUrl: event.target.value,
            }))
          }
          placeholder="https://example.com/collection.png"
          value={values.imageUrl ?? ''}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="asset-group-label">Label</Label>
        <Input
          id="asset-group-label"
          onChange={(event) =>
            setValues((currentValues) => ({
              ...currentValues,
              label: event.target.value,
            }))
          }
          placeholder={fallbackLabel || 'Defaults to the address'}
          value={values.label}
        />
      </div>
      {showEnabled ? (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={values.enabled}
            id="asset-group-enabled"
            onCheckedChange={(checked) =>
              setValues((currentValues) => ({
                ...currentValues,
                enabled: Boolean(checked),
              }))
            }
          />
          <Label htmlFor="asset-group-enabled">Enabled</Label>
        </div>
      ) : null}
      <div className="flex justify-end">
        <Button disabled={isPending || !values.address.trim()} type="submit">
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  )
}
