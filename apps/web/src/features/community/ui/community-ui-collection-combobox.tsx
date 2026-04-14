import type { CommunityCollectionEntity } from '@tokengator/sdk'

import { ellipsify } from '@wallet-ui/react'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from '@tokengator/ui/components/combobox'

interface CommunityUiCollectionComboboxProps {
  collections: CommunityCollectionEntity[]
  onCollectionChange: (address: string) => void
  selectedCollectionAddress: string
}

export function CommunityUiCollectionCombobox(props: CommunityUiCollectionComboboxProps) {
  const { collections, onCollectionChange, selectedCollectionAddress } = props
  const sortedCollections = [...collections].sort((collectionA, collectionB) => {
    const labelComparison = collectionA.label.localeCompare(collectionB.label)

    if (labelComparison !== 0) {
      return labelComparison
    }

    return collectionA.address.localeCompare(collectionB.address)
  })
  const collectionsByAddress = new Map(sortedCollections.map((collection) => [collection.address, collection]))
  const selectedCollection = collectionsByAddress.get(selectedCollectionAddress) ?? null

  return (
    <div className="grid gap-1.5 md:max-w-sm">
      <Combobox
        items={sortedCollections}
        itemToStringLabel={(collection) => collection.label}
        itemToStringValue={(collection) => collection.address}
        onValueChange={(collection) => {
          if (collection && collection.address !== selectedCollectionAddress) {
            onCollectionChange(collection.address)
          }
        }}
        value={selectedCollection}
      >
        <ComboboxTrigger
          aria-labelledby="community-collection-combobox-label"
          className="border-input hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-ring/50 flex h-auto min-h-14 w-full items-center gap-3 rounded-md border bg-transparent px-3 py-2 text-left shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
          id="community-collection-combobox"
        >
          <div className="min-w-0 flex-1">
            <ComboboxValue placeholder="Select collection">
              {() => {
                if (!selectedCollection) {
                  return <span className="text-muted-foreground text-sm">Select collection</span>
                }

                return (
                  <div className="grid min-w-0 gap-0.5">
                    <span className="truncate text-sm font-medium">{selectedCollection.label}</span>
                    <span
                      className="text-muted-foreground truncate font-mono text-xs"
                      title={selectedCollection.address}
                    >
                      {ellipsify(selectedCollection.address)}
                    </span>
                  </div>
                )
              }}
            </ComboboxValue>
          </div>
        </ComboboxTrigger>
        <ComboboxContent>
          <div className="p-1">
            <ComboboxInput
              aria-label="Search collections"
              className="w-full"
              placeholder="Search collections..."
              showClear
              showTrigger={false}
            />
          </div>
          <ComboboxEmpty>No collections found.</ComboboxEmpty>
          <ComboboxList>
            {(collection: CommunityCollectionEntity) => (
              <ComboboxItem className="items-start py-2 pr-8" key={collection.address} value={collection}>
                <div className="grid min-w-0 gap-0.5">
                  <span className="truncate text-sm font-medium">{collection.label}</span>
                  <span className="text-muted-foreground truncate font-mono text-xs" title={collection.address}>
                    {ellipsify(collection.address)}
                  </span>
                </div>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}
