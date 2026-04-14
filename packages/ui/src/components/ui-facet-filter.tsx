'use client'

import * as React from 'react'

import { ChevronDownIcon, ChevronUpIcon, SearchIcon } from 'lucide-react'
import { Button } from '@tokengator/ui/components/button'
import { Checkbox } from '@tokengator/ui/components/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@tokengator/ui/components/dropdown-menu'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@tokengator/ui/components/input-group'
import { Separator } from '@tokengator/ui/components/separator'
import { cn } from '@tokengator/ui/lib/utils'

export type UiFacetFilterSelection = Record<string, string[]>

export interface UiFacetFilterOption {
  disabled?: boolean
  label: string
  meta?: React.ReactNode
  value: string
}

export interface UiFacetFilterGroup {
  id: string
  label: string
  meta?: React.ReactNode
  options: UiFacetFilterOption[]
}

interface UiFacetFilterSharedProps {
  defaultExpandedGroupIds?: string[]
  emptyMessage?: React.ReactNode
  groups: UiFacetFilterGroup[]
  label: React.ReactNode
  onSelectedValuesChange: (selectedValues: UiFacetFilterSelection) => void
  searchPlaceholder?: string
  selectedValues: UiFacetFilterSelection
}

export interface UiFacetFilterPanelProps extends React.ComponentProps<'div'>, UiFacetFilterSharedProps {}

export interface UiFacetFilterProps extends UiFacetFilterSharedProps {
  contentClassName?: string
  panelClassName?: string
  triggerClassName?: string
}

function getDefaultExpandedGroupIds(args: {
  defaultExpandedGroupIds?: string[]
  groups: UiFacetFilterGroup[]
}): string[] {
  const { defaultExpandedGroupIds, groups } = args
  const validGroupIds = new Set(groups.map((group) => group.id))

  if (defaultExpandedGroupIds !== undefined) {
    return defaultExpandedGroupIds.filter(
      (groupId, index, groupIds) => validGroupIds.has(groupId) && groupIds.indexOf(groupId) === index,
    )
  }

  return []
}

function getOrderedExpandedGroupIds(args: { groupIds: string[]; groups: UiFacetFilterGroup[] }): string[] {
  const groupIds = new Set(args.groupIds)

  return args.groups.map((group) => group.id).filter((groupId) => groupIds.has(groupId))
}

function getNormalizedFacetFilterSelection(args: {
  groups: UiFacetFilterGroup[]
  selectedValues: UiFacetFilterSelection
}): UiFacetFilterSelection {
  const normalizedSelection: UiFacetFilterSelection = {}

  for (const group of args.groups) {
    const optionIndexes = new Map(group.options.map((option, index) => [option.value, index]))
    const groupSelection = Array.from(new Set(args.selectedValues[group.id] ?? []))
      .filter((value) => optionIndexes.has(value))
      .sort(
        (leftValue, rightValue) =>
          (optionIndexes.get(leftValue) ?? Number.MAX_SAFE_INTEGER) -
          (optionIndexes.get(rightValue) ?? Number.MAX_SAFE_INTEGER),
      )

    if (groupSelection.length > 0) {
      normalizedSelection[group.id] = groupSelection
    }
  }

  return normalizedSelection
}

function areStringArraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function getFacetFilterOptionInputId(args: { groupId: string; optionValue: string; panelId: string }) {
  const suffix = `${args.groupId}-${args.optionValue}`.replace(/[^a-zA-Z0-9_-]+/g, '-')

  return `${args.panelId}-${suffix}`
}

function UiFacetFilterPanel(props: UiFacetFilterPanelProps) {
  const {
    className,
    defaultExpandedGroupIds,
    emptyMessage = 'No facet values found.',
    groups,
    label,
    onSelectedValuesChange,
    searchPlaceholder = 'Search',
    selectedValues,
    ...divProps
  } = props
  const defaultExpandedIds = React.useMemo(
    () =>
      getDefaultExpandedGroupIds({
        defaultExpandedGroupIds,
        groups,
      }),
    [defaultExpandedGroupIds, groups],
  )
  const defaultExpandedSignature = React.useMemo(() => defaultExpandedIds.join('|'), [defaultExpandedIds])
  const groupIdsSignature = React.useMemo(() => groups.map((group) => group.id).join('|'), [groups])
  const panelId = React.useId()
  const [manualExpandedGroupIds, setManualExpandedGroupIds] = React.useState(defaultExpandedIds)
  const [search, setSearch] = React.useState('')
  const normalizedSearch = search.trim().toLowerCase()
  const isSearching = normalizedSearch.length > 0
  const visibleGroups = React.useMemo(
    () =>
      groups.flatMap((group) => {
        if (!isSearching) {
          return [group]
        }

        const visibleOptions = group.options.filter((option) => option.label.toLowerCase().includes(normalizedSearch))

        return visibleOptions.length > 0
          ? [
              {
                ...group,
                options: visibleOptions,
              },
            ]
          : []
      }),
    [groups, isSearching, normalizedSearch],
  )
  const expandedGroupIds = isSearching
    ? visibleGroups.map((group) => group.id)
    : getOrderedExpandedGroupIds({
        groupIds: manualExpandedGroupIds,
        groups,
      })

  React.useEffect(() => {
    setManualExpandedGroupIds((currentExpandedGroupIds) => {
      const nextExpandedGroupIds = getOrderedExpandedGroupIds({
        groupIds: currentExpandedGroupIds,
        groups,
      })

      if (nextExpandedGroupIds.length > 0 || defaultExpandedSignature.length === 0) {
        return areStringArraysEqual(currentExpandedGroupIds, nextExpandedGroupIds)
          ? currentExpandedGroupIds
          : nextExpandedGroupIds
      }

      return areStringArraysEqual(currentExpandedGroupIds, defaultExpandedIds)
        ? currentExpandedGroupIds
        : defaultExpandedIds
    })
  }, [defaultExpandedIds, defaultExpandedSignature, groupIdsSignature, groups])

  return (
    <div
      className={cn('bg-card grid gap-3 rounded-lg border p-3', className)}
      data-slot="ui-facet-filter-panel"
      {...divProps}
    >
      <div className="font-medium" data-slot="ui-facet-filter-label">
        {label}
      </div>
      <InputGroup className="h-9" data-slot="ui-facet-filter-search">
        <InputGroupInput
          aria-label={typeof label === 'string' ? `${label} search` : 'Facet search'}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            event.stopPropagation()
          }}
          placeholder={searchPlaceholder}
          value={search}
        />
        <InputGroupAddon align="inline-end">
          <SearchIcon className="text-muted-foreground size-4" />
        </InputGroupAddon>
      </InputGroup>
      <div className="grid max-h-96 gap-0 overflow-y-auto pr-1" data-slot="ui-facet-filter-groups">
        {visibleGroups.length > 0 ? (
          visibleGroups.map((group, groupIndex) => {
            const isExpanded = expandedGroupIds.includes(group.id)

            return (
              <div className="grid gap-2 py-2 first:pt-0 last:pb-0" data-slot="ui-facet-filter-group" key={group.id}>
                {groupIndex > 0 ? <Separator className="-mt-2 mb-1" /> : null}
                <button
                  aria-expanded={isExpanded}
                  className="hover:bg-muted/40 flex items-center gap-2 rounded-md px-1 py-1 text-left text-sm font-medium transition-colors outline-none"
                  data-slot="ui-facet-filter-group-trigger"
                  onClick={() => {
                    if (isSearching) {
                      return
                    }

                    setManualExpandedGroupIds((currentExpandedGroupIds) =>
                      currentExpandedGroupIds.includes(group.id)
                        ? currentExpandedGroupIds.filter((groupId) => groupId !== group.id)
                        : getOrderedExpandedGroupIds({
                            groupIds: [...currentExpandedGroupIds, group.id],
                            groups,
                          }),
                    )
                  }}
                  type="button"
                >
                  <span>{group.label}</span>
                  {group.meta !== undefined ? (
                    <span className="text-muted-foreground ml-auto text-xs tabular-nums">{group.meta}</span>
                  ) : (
                    <span className="ml-auto" />
                  )}
                  {isExpanded ? (
                    <ChevronUpIcon className="text-muted-foreground size-4" />
                  ) : (
                    <ChevronDownIcon className="text-muted-foreground size-4" />
                  )}
                </button>
                {isExpanded ? (
                  <div className="grid gap-1" data-slot="ui-facet-filter-group-options">
                    {group.options.map((option) => {
                      const isSelected = selectedValues[group.id]?.includes(option.value) ?? false
                      const isDisabled = !isSelected && option.disabled === true
                      const inputId = getFacetFilterOptionInputId({
                        groupId: group.id,
                        optionValue: option.value,
                        panelId,
                      })

                      return (
                        <label
                          aria-disabled={isDisabled}
                          className={cn(
                            'flex items-center gap-3 rounded-md px-1 py-1.5 text-sm',
                            isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-muted/40 cursor-pointer',
                          )}
                          data-slot="ui-facet-filter-option"
                          htmlFor={inputId}
                          key={option.value}
                        >
                          <Checkbox
                            checked={isSelected}
                            disabled={isDisabled}
                            id={inputId}
                            onCheckedChange={() => {
                              if (isDisabled) {
                                return
                              }

                              const currentGroupSelection = new Set(selectedValues[group.id] ?? [])

                              if (isSelected) {
                                currentGroupSelection.delete(option.value)
                              } else {
                                currentGroupSelection.add(option.value)
                              }

                              onSelectedValuesChange(
                                getNormalizedFacetFilterSelection({
                                  groups,
                                  selectedValues: {
                                    ...selectedValues,
                                    [group.id]: Array.from(currentGroupSelection),
                                  },
                                }),
                              )
                            }}
                          />
                          <span className="min-w-0 flex-1 truncate">{option.label}</span>
                          {option.meta !== undefined ? (
                            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">{option.meta}</span>
                          ) : null}
                        </label>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })
        ) : (
          <div className="text-muted-foreground py-3 text-center text-xs/relaxed" data-slot="ui-facet-filter-empty">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  )
}

function UiFacetFilter(props: UiFacetFilterProps) {
  const { contentClassName, panelClassName, triggerClassName, ...panelProps } = props

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-slot="ui-facet-filter-trigger"
        render={
          <Button className={cn('justify-between gap-2', triggerClassName)} data-icon="inline-end" variant="outline" />
        }
      >
        <span>{panelProps.label}</span>
        <ChevronDownIcon className="text-muted-foreground size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={cn('w-[22rem] min-w-[22rem] bg-transparent p-0 shadow-none ring-0 before:hidden', contentClassName)}
        sideOffset={8}
      >
        <UiFacetFilterPanel {...panelProps} className={panelClassName} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { UiFacetFilter, UiFacetFilterPanel }
