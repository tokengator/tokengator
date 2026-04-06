import { parseNonNegativeInteger, parsePositiveInteger } from './admin-asset-search'

const defaultAssetGroupLimit = 25

export interface AdminAssetGroupListSearch {
  limit: number
  offset: number
  search?: string
}

export function validateAdminAssetGroupListSearch(search: Record<string, unknown>): AdminAssetGroupListSearch {
  return {
    limit: parsePositiveInteger(search.limit, defaultAssetGroupLimit),
    offset: parseNonNegativeInteger(search.offset, 0),
    search: typeof search.search === 'string' ? search.search.trim() || undefined : undefined,
  }
}
