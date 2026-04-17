import { useEffect, useState } from 'react'

import { XIcon } from 'lucide-react'
import type { CommunityCollectionOwnerCandidateEntity } from '@tokengator/sdk'
import { Badge } from '@tokengator/ui/components/badge'
import { Button } from '@tokengator/ui/components/button'
import { Input } from '@tokengator/ui/components/input'
import { Label } from '@tokengator/ui/components/label'
import {
  UiFacetFilter,
  type UiFacetFilterGroup,
  type UiFacetFilterSelection,
} from '@tokengator/ui/components/ui-facet-filter'

import type { CommunityCollectionAssetGrid } from '../util/community-collection-asset-search'
import { CommunityUiCollectionOwnerCombobox } from './community-ui-collection-owner-combobox'

interface CommunityCollectionAssetBrowserControlsProps {
  facetGroups: UiFacetFilterGroup[]
  grid: CommunityCollectionAssetGrid
  initialFacets: UiFacetFilterSelection
  initialOwner: string
  initialQuery: string
  isOwnerCandidatesPending: boolean
  isOwnerComboboxOpen: boolean
  onApply: (values: { facets: UiFacetFilterSelection; owner: string; query: string }) => void
  onGridChange: (grid: CommunityCollectionAssetGrid) => void
  onOwnerComboboxOpenChange: (open: boolean) => void
  onOwnerCommit: (owner: string) => void
  onOwnerDraftChange: (owner: string) => void
  onReset: () => void
  ownerCandidates: CommunityCollectionOwnerCandidateEntity[]
}

const communityCollectionAssetGridOptions = [4, 8, 12] as const

type CommunityCollectionSelectedFacet = {
  groupId: string
  groupLabel: string
  value: string
  valueLabel: string
}

function getNormalizedCommunityCollectionFacetSelection(args: {
  facetGroups: UiFacetFilterGroup[]
  selectedValues: UiFacetFilterSelection
}): UiFacetFilterSelection {
  const normalizedSelection = Object.fromEntries(
    args.facetGroups
      .map((group) => {
        const validValues = new Set(group.options.map((option) => option.value))
        const normalizedValues = [...new Set(args.selectedValues[group.id] ?? [])]
          .filter((value) => validValues.has(value))
          .sort((leftValue, rightValue) => leftValue.localeCompare(rightValue))

        return [group.id, normalizedValues] as const
      })
      .filter(([, values]) => values.length > 0)
      .sort(([leftGroupId], [rightGroupId]) => leftGroupId.localeCompare(rightGroupId)),
  )

  return normalizedSelection
}

function getCommunityCollectionFacetSelectionKey(selectedValues: UiFacetFilterSelection) {
  return JSON.stringify(
    Object.entries(selectedValues)
      .sort(([leftGroupId], [rightGroupId]) => leftGroupId.localeCompare(rightGroupId))
      .map(([groupId, values]) => [groupId, [...values].sort()]),
  )
}

function getSelectedCommunityCollectionFacets(args: {
  facetGroups: UiFacetFilterGroup[]
  selectedValues: UiFacetFilterSelection
}): CommunityCollectionSelectedFacet[] {
  return args.facetGroups
    .flatMap((group) => {
      const selectedGroupValues = new Set(args.selectedValues[group.id] ?? [])

      return group.options
        .filter((option) => selectedGroupValues.has(option.value))
        .map((option) => ({
          groupId: group.id,
          groupLabel: group.label,
          value: option.value,
          valueLabel: option.label,
        }))
    })
    .sort(
      (leftFacet, rightFacet) =>
        leftFacet.groupLabel.localeCompare(rightFacet.groupLabel) ||
        leftFacet.valueLabel.localeCompare(rightFacet.valueLabel) ||
        leftFacet.groupId.localeCompare(rightFacet.groupId) ||
        leftFacet.value.localeCompare(rightFacet.value),
    )
}

export function CommunityUiCollectionAssetBrowserControls(props: CommunityCollectionAssetBrowserControlsProps) {
  const {
    facetGroups,
    grid,
    initialFacets,
    initialOwner,
    initialQuery,
    isOwnerCandidatesPending,
    isOwnerComboboxOpen,
    onApply,
    onGridChange,
    onOwnerComboboxOpenChange,
    onOwnerCommit,
    onOwnerDraftChange,
    onReset,
    ownerCandidates,
  } = props
  const normalizedInitialFacets = getNormalizedCommunityCollectionFacetSelection({
    facetGroups,
    selectedValues: initialFacets,
  })
  const initialFacetsKey = getCommunityCollectionFacetSelectionKey(normalizedInitialFacets)
  const [draftOwner, setDraftOwner] = useState(initialOwner)
  const [draftQuery, setDraftQuery] = useState(initialQuery)
  const [facetSelection, setFacetSelection] = useState(normalizedInitialFacets)

  useEffect(() => {
    setFacetSelection(normalizedInitialFacets)
  }, [initialFacetsKey])

  useEffect(() => {
    setDraftOwner(initialOwner)
    onOwnerDraftChange(initialOwner)
  }, [initialOwner, onOwnerDraftChange])

  useEffect(() => {
    setDraftQuery(initialQuery)
  }, [initialQuery])

  const selectedFacetBadges = getSelectedCommunityCollectionFacets({
    facetGroups,
    selectedValues: facetSelection,
  })
  const hasSelectedFacetBadges = selectedFacetBadges.length > 0

  function handleFacetSelectionChange(facets: UiFacetFilterSelection) {
    const nextValues = {
      facets: getNormalizedCommunityCollectionFacetSelection({
        facetGroups,
        selectedValues: facets,
      }),
      owner: draftOwner,
      query: draftQuery,
    }

    setFacetSelection(nextValues.facets)
    onApply(nextValues)
  }

  return (
    <form
      className="grid gap-4 border p-4"
      onSubmit={(event) => {
        event.preventDefault()
        onApply({
          facets: facetSelection,
          owner: draftOwner,
          query: draftQuery,
        })
      }}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(14rem,18rem)_auto]">
        <div className="grid gap-1.5">
          <Label htmlFor="community-collection-query">Search</Label>
          <Input
            id="community-collection-query"
            onChange={(event) => setDraftQuery(event.target.value)}
            placeholder="Search by asset name or address"
            value={draftQuery}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="community-collection-owner">Owner</Label>
          <CommunityUiCollectionOwnerCombobox
            candidates={ownerCandidates}
            committedValue={initialOwner}
            draftValue={draftOwner}
            id="community-collection-owner"
            isOpen={isOwnerComboboxOpen}
            isPending={isOwnerCandidatesPending}
            onDraftValueChange={(owner) => {
              setDraftOwner(owner)
              onOwnerDraftChange(owner)
            }}
            onOpenChange={onOwnerComboboxOpenChange}
            onValueCommit={onOwnerCommit}
          />
        </div>
        {facetGroups.length > 0 ? (
          <div className="grid gap-1.5">
            <Label>Traits</Label>
            <UiFacetFilter
              groups={facetGroups}
              label={
                hasSelectedFacetBadges ? (
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true" className="size-2 rounded-full bg-sky-500" />
                    <span>Traits</span>
                    <span className="sr-only">Trait filters selected</span>
                  </span>
                ) : (
                  'Traits'
                )
              }
              onSelectedValuesChange={handleFacetSelectionChange}
              selectedValues={facetSelection}
              triggerClassName="w-full"
            />
          </div>
        ) : null}
        <div className="flex items-end justify-end gap-2">
          <Button
            onClick={() => {
              setDraftOwner('')
              onOwnerDraftChange('')
              setDraftQuery('')
              setFacetSelection({})
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
      {selectedFacetBadges.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedFacetBadges.map((facet) => (
            <Badge className="gap-1.5" key={`${facet.groupId}:${facet.value}`} variant="outline">
              <span>{`${facet.groupLabel}: ${facet.valueLabel}`}</span>
              <button
                aria-label={`Remove ${facet.groupLabel}: ${facet.valueLabel} trait filter`}
                className="rounded-full p-0.5 transition-colors"
                onClick={() => {
                  const nextGroupValues = (facetSelection[facet.groupId] ?? []).filter((value) => value !== facet.value)

                  handleFacetSelectionChange({
                    ...facetSelection,
                    [facet.groupId]: nextGroupValues,
                  })
                }}
                type="button"
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
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
