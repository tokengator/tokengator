import { parseNonNegativeInteger, parsePositiveInteger } from './admin-asset-search'

const defaultAssetLimit = 50

export interface AdminAssetListSearch {
  address?: string
  limit: number
  offset: number
  owner?: string
  resolverKind?: 'helius-collection-assets' | 'helius-token-accounts'
}

export function validateAdminAssetListSearch(search: Record<string, unknown>): AdminAssetListSearch {
  return {
    address: typeof search.address === 'string' ? search.address.trim() || undefined : undefined,
    limit: parsePositiveInteger(search.limit, defaultAssetLimit),
    offset: parseNonNegativeInteger(search.offset, 0),
    owner: typeof search.owner === 'string' ? search.owner.trim() || undefined : undefined,
    resolverKind:
      search.resolverKind === 'helius-collection-assets' || search.resolverKind === 'helius-token-accounts'
        ? search.resolverKind
        : undefined,
  }
}
