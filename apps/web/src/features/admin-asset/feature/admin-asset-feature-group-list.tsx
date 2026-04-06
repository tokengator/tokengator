import { Link, useNavigate } from '@tanstack/react-router'
import { Button, buttonVariants } from '@tokengator/ui/components/button'
import { cn } from '@tokengator/ui/lib/utils'

import type { AdminAssetGroupListSearch } from '@/features/admin-asset/util/admin-asset-group-list-search'

import { useAdminAssetGroupListQuery } from '../data-access/use-admin-asset-group-list-query'
import { AdminAssetGroupUiFilters } from '../ui/admin-asset-group-ui-filters'
import { AdminAssetGroupUiTable } from '../ui/admin-asset-group-ui-table'

interface AdminAssetFeatureGroupListProps {
  search: AdminAssetGroupListSearch
}

export function AdminAssetFeatureGroupList(props: AdminAssetFeatureGroupListProps) {
  const { search } = props
  const assetGroups = useAdminAssetGroupListQuery({
    limit: search.limit,
    offset: search.offset,
    search: search.search?.trim() || undefined,
  })
  const navigate = useNavigate()
  const shownCount = assetGroups.data?.assetGroups.length ?? 0
  const total = assetGroups.data?.total ?? 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-medium">Assets</h2>
          <p className="text-muted-foreground text-sm">Manage asset groups and review indexed assets by group.</p>
        </div>
        <Link className={cn(buttonVariants({ variant: 'default' }))} to="/admin/assets/create">
          Create Asset Group
        </Link>
      </div>

      <AdminAssetGroupUiFilters
        initialSearch={search.search ?? ''}
        onApply={(nextSearch) => {
          void navigate({
            search: {
              limit: search.limit,
              offset: 0,
              search: nextSearch.trim() || undefined,
            },
            to: '/admin/assets',
          })
        }}
        onReset={() => {
          void navigate({
            search: {
              limit: search.limit,
              offset: 0,
              search: undefined,
            },
            to: '/admin/assets',
          })
        }}
      />

      {assetGroups.error ? <div className="text-destructive text-sm">{assetGroups.error.message}</div> : null}
      {assetGroups.isPending ? <div className="text-muted-foreground text-sm">Loading asset groups...</div> : null}

      <AdminAssetGroupUiTable
        assetGroups={assetGroups.data?.assetGroups ?? []}
        renderActions={(assetGroup) => (
          <div className="flex justify-end gap-2">
            <Link
              className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
              params={{
                assetGroupId: assetGroup.id,
              }}
              search={{
                limit: 50,
                offset: 0,
              }}
              to="/admin/assets/$assetGroupId/assets"
            >
              Assets
            </Link>
            <Link
              className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
              params={{
                assetGroupId: assetGroup.id,
              }}
              to="/admin/assets/$assetGroupId/settings"
            >
              Settings
            </Link>
          </div>
        )}
        renderLabel={(assetGroup) => (
          <Link
            className="hover:underline"
            params={{
              assetGroupId: assetGroup.id,
            }}
            search={{
              limit: 50,
              offset: 0,
            }}
            to="/admin/assets/$assetGroupId/assets"
          >
            {assetGroup.label}
          </Link>
        )}
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
                search: {
                  ...search,
                  offset: Math.max(0, search.offset - search.limit),
                },
                to: '/admin/assets',
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
                search: {
                  ...search,
                  offset: search.offset + search.limit,
                },
                to: '/admin/assets',
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
