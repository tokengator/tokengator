export type CommunityCollectionAssetGrid = 4 | 8 | 12

export interface CommunityCollectionAssetSearch {
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

export function validateCommunityCollectionAssetSearch(
  search: Record<string, unknown>,
): CommunityCollectionAssetSearch {
  return {
    grid: parseCommunityCollectionAssetGrid(search.grid),
    owner: typeof search.owner === 'string' ? search.owner.trim() || undefined : undefined,
    query: typeof search.query === 'string' ? search.query.trim() || undefined : undefined,
  }
}
