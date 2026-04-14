export type CommunityCollectionAssetGrid = 4 | 8 | 12
export type CommunityCollectionAssetFacetSelection = Record<string, string[]>

export interface CommunityCollectionAssetSearch {
  facets?: CommunityCollectionAssetFacetSelection
  grid: CommunityCollectionAssetGrid
  owner?: string
  query?: string
}

const defaultCommunityCollectionAssetGrid = 8

function parseCommunityCollectionAssetGrid(value: unknown): CommunityCollectionAssetGrid {
  const parsedValue =
    typeof value === 'number' ? value : typeof value === 'string' ? Number.parseInt(value, 10) : Number.NaN

  if (parsedValue === 4 || parsedValue === 8 || parsedValue === 12) {
    return parsedValue
  }

  return defaultCommunityCollectionAssetGrid
}

export function parseCommunityCollectionAssetFacetSelection(
  value: unknown,
): CommunityCollectionAssetFacetSelection | undefined {
  const parsedValue = parseCommunityCollectionAssetFacetSelectionValue(value)

  if (!parsedValue) {
    return undefined
  }

  const normalizedValuesByGroupId = new Map<string, Set<string>>()

  for (const [groupId, values] of Object.entries(parsedValue)) {
    const normalizedGroupId = groupId.trim().toLowerCase()

    if (!normalizedGroupId) {
      continue
    }

    const currentValues = normalizedValuesByGroupId.get(normalizedGroupId) ?? new Set<string>()

    for (const currentValue of values) {
      const normalizedValue = currentValue.trim().toLowerCase()

      if (normalizedValue) {
        currentValues.add(normalizedValue)
      }
    }

    if (currentValues.size > 0) {
      normalizedValuesByGroupId.set(normalizedGroupId, currentValues)
    }
  }

  const normalizedFacetSelection = Object.fromEntries(
    [...normalizedValuesByGroupId.entries()]
      .sort(([leftGroupId], [rightGroupId]) => leftGroupId.localeCompare(rightGroupId))
      .map(([groupId, values]) => [groupId, [...values].sort()]),
  )

  return Object.keys(normalizedFacetSelection).length > 0 ? normalizedFacetSelection : undefined
}

function parseCommunityCollectionAssetFacetSelectionValue(value: unknown): Record<string, string[]> | undefined {
  if (typeof value === 'string') {
    try {
      return parseCommunityCollectionAssetFacetSelectionValue(JSON.parse(value))
    } catch {
      return undefined
    }
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([groupId, values]) => [
        groupId,
        Array.isArray(values)
          ? values.filter((currentValue): currentValue is string => typeof currentValue === 'string')
          : [],
      ])
      .filter(([, values]) => values.length > 0),
  )
}

export function validateCommunityCollectionAssetSearch(
  search: Record<string, unknown>,
): CommunityCollectionAssetSearch {
  return {
    facets: parseCommunityCollectionAssetFacetSelection(search.facets),
    grid: parseCommunityCollectionAssetGrid(search.grid),
    owner: typeof search.owner === 'string' ? search.owner.trim() || undefined : undefined,
    query: typeof search.query === 'string' ? search.query.trim() || undefined : undefined,
  }
}
