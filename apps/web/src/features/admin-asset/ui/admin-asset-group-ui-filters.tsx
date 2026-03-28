import { useEffect, useState } from 'react'
import { Button } from '@tokengator/ui/components/button'
import { Input } from '@tokengator/ui/components/input'

interface AdminAssetGroupUiFiltersProps {
  initialSearch: string
  onApply: (search: string) => void
  onReset: () => void
}

export function AdminAssetGroupUiFilters(props: AdminAssetGroupUiFiltersProps) {
  const { initialSearch, onApply, onReset } = props
  const [search, setSearch] = useState(initialSearch)

  useEffect(() => {
    setSearch(initialSearch)
  }, [initialSearch])

  return (
    <div className="flex flex-col gap-3 border p-4">
      <div className="grid gap-1.5">
        <label className="text-sm" htmlFor="asset-group-search">
          Search
        </label>
        <Input
          id="asset-group-search"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search label, type, or address"
          value={search}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          onClick={() => {
            setSearch('')
            onReset()
          }}
          type="button"
          variant="outline"
        >
          Reset
        </Button>
        <Button onClick={() => onApply(search)} type="button">
          Apply
        </Button>
      </div>
    </div>
  )
}
