import { useEffect, useState } from 'react'

import { Button } from '@tokengator/ui/components/button'
import { Input } from '@tokengator/ui/components/input'
import { Label } from '@tokengator/ui/components/label'

import type { CommunityCollectionAssetGrid } from '../util/community-collection-asset-search'

interface CommunityCollectionAssetBrowserControlsProps {
  grid: CommunityCollectionAssetGrid
  initialOwner: string
  initialQuery: string
  onApply: (values: { owner: string; query: string }) => void
  onGridChange: (grid: CommunityCollectionAssetGrid) => void
  onReset: () => void
}

const communityCollectionAssetGridOptions = [4, 8, 12] as const

export function CommunityUiCollectionAssetBrowserControls(props: CommunityCollectionAssetBrowserControlsProps) {
  const { grid, initialOwner, initialQuery, onApply, onGridChange, onReset } = props
  const [values, setValues] = useState({
    owner: initialOwner,
    query: initialQuery,
  })

  useEffect(() => {
    setValues({
      owner: initialOwner,
      query: initialQuery,
    })
  }, [initialOwner, initialQuery])

  return (
    <form
      className="grid gap-4 border p-4"
      onSubmit={(event) => {
        event.preventDefault()
        onApply(values)
      }}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div className="grid gap-1.5">
          <Label htmlFor="community-collection-query">Search</Label>
          <Input
            id="community-collection-query"
            onChange={(event) =>
              setValues((currentValues) => ({
                ...currentValues,
                query: event.target.value,
              }))
            }
            placeholder="Search by asset name or address"
            value={values.query}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="community-collection-owner">Owner</Label>
          <Input
            id="community-collection-owner"
            onChange={(event) =>
              setValues((currentValues) => ({
                ...currentValues,
                owner: event.target.value,
              }))
            }
            placeholder="Search by owner address"
            value={values.owner}
          />
        </div>
        <div className="flex items-end justify-end gap-2">
          <Button
            onClick={() => {
              setValues({
                owner: '',
                query: '',
              })
              onReset()
            }}
            type="button"
            variant="outline"
          >
            Reset
          </Button>
          <Button type="submit">Apply</Button>
        </div>
      </div>
      <div className="grid gap-1.5 justify-self-end">
        <Label>Grid</Label>
        <div className="flex gap-2">
          {communityCollectionAssetGridOptions.map((gridOption) => (
            <Button
              key={gridOption}
              onClick={() => onGridChange(gridOption)}
              type="button"
              variant={grid === gridOption ? 'default' : 'outline'}
            >
              {gridOption}x
            </Button>
          ))}
        </div>
      </div>
    </form>
  )
}
