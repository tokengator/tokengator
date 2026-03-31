import { useNavigate } from '@tanstack/react-router'
import { Button } from '@tokengator/ui/components/button'

import { useAdminAssetDelete } from '../data-access/use-admin-asset-delete'
import { useAdminAssetGroupIndex } from '../data-access/use-admin-asset-group-index'
import { useAdminAssetListQuery } from '../data-access/use-admin-asset-list-query'
import { type AdminAssetFiltersValues, AdminAssetUiFilters } from '../ui/admin-asset-ui-filters'
import { AdminAssetUiTable } from '../ui/admin-asset-ui-table'
import { parseNonNegativeInteger, parsePositiveInteger } from '../util/admin-asset-search'

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

interface AdminAssetFeatureGroupAssetsProps {
  assetGroupId: string
  search: AdminAssetListSearch
}

export function AdminAssetFeatureGroupAssets(props: AdminAssetFeatureGroupAssetsProps) {
  const { assetGroupId, search } = props
  const assets = useAdminAssetListQuery({
    address: search.address?.trim() || undefined,
    assetGroupId,
    limit: search.limit,
    offset: search.offset,
    owner: search.owner?.trim() || undefined,
    resolverKind: search.resolverKind,
  })
  const deleteAsset = useAdminAssetDelete()
  const indexAssetGroup = useAdminAssetGroupIndex()
  const navigate = useNavigate()
  const shownCount = assets.data?.assets.length ?? 0
  const total = assets.data?.total ?? 0

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          disabled={indexAssetGroup.isPending}
          onClick={() => {
            indexAssetGroup.mutate({
              assetGroupId,
            })
          }}
          type="button"
        >
          {indexAssetGroup.isPending ? 'Indexing...' : 'Index'}
        </Button>
      </div>

      <AdminAssetUiFilters
        initialValues={{
          address: search.address ?? '',
          owner: search.owner ?? '',
          resolverKind: search.resolverKind ?? '',
        }}
        onApply={(values: AdminAssetFiltersValues) => {
          void navigate({
            params: {
              assetGroupId,
            },
            search: {
              address: values.address.trim() || undefined,
              limit: search.limit,
              offset: 0,
              owner: values.owner.trim() || undefined,
              resolverKind: values.resolverKind || undefined,
            },
            to: '/admin/assets/$assetGroupId/assets',
          })
        }}
        onReset={() => {
          void navigate({
            params: {
              assetGroupId,
            },
            search: {
              address: undefined,
              limit: search.limit,
              offset: 0,
              owner: undefined,
              resolverKind: undefined,
            },
            to: '/admin/assets/$assetGroupId/assets',
          })
        }}
      />

      {assets.error ? <div className="text-destructive text-sm">{assets.error.message}</div> : null}
      {indexAssetGroup.error ? <div className="text-destructive text-sm">{indexAssetGroup.error.message}</div> : null}
      {assets.isPending ? <div className="text-muted-foreground text-sm">Loading assets...</div> : null}

      <AdminAssetUiTable
        assets={assets.data?.assets ?? []}
        deletingAssetId={deleteAsset.variables?.id}
        isDeletePending={deleteAsset.isPending}
        onDelete={(id) => {
          deleteAsset.mutate({
            id,
          })
        }}
      />

      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          {shownCount
            ? `Showing ${search.offset + 1}-${search.offset + shownCount} of ${total}`
            : 'No rows on this page'}
        </div>
        <div className="flex gap-2">
          <Button
            disabled={search.offset <= 0}
            onClick={() => {
              void navigate({
                params: {
                  assetGroupId,
                },
                search: {
                  ...search,
                  offset: Math.max(0, search.offset - search.limit),
                },
                to: '/admin/assets/$assetGroupId/assets',
              })
            }}
            type="button"
            variant="outline"
          >
            Previous
          </Button>
          <Button
            disabled={search.offset + shownCount >= total}
            onClick={() => {
              void navigate({
                params: {
                  assetGroupId,
                },
                search: {
                  ...search,
                  offset: search.offset + search.limit,
                },
                to: '/admin/assets/$assetGroupId/assets',
              })
            }}
            type="button"
            variant="outline"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
