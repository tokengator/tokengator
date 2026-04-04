import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@tokengator/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import {
  UiInfoCard,
  UiInfoCardError,
  UiInfoCardLabel,
  UiInfoCardMeta,
  UiInfoCardValue,
} from '@tokengator/ui/components/ui-info-card'
import { UiStatus } from '@tokengator/ui/components/ui-status'

import { formatTimestamp, getFreshnessTone } from '@/utils/admin-automation'
import { orpc } from '@/utils/orpc'
import { useAdminAssetDelete } from '../data-access/use-admin-asset-delete'
import { useAdminAssetGroupGetQuery } from '../data-access/use-admin-asset-group-get-query'
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
  const assetGroup = useAdminAssetGroupGetQuery(assetGroupId)
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
  const indexRuns = useQuery(
    orpc.adminAssetGroup.listIndexRuns.queryOptions({
      enabled: Boolean(assetGroupId),
      input: {
        assetGroupId,
        limit: 5,
      },
    }),
  )
  const navigate = useNavigate()
  const shownCount = assets.data?.assets.length ?? 0
  const total = assets.data?.total ?? 0
  const indexingStatus = assetGroup.data?.indexingStatus ?? null

  return (
    <div className="space-y-4">
      {indexingStatus ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Index Status</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <UiInfoCard>
              <UiInfoCardLabel>Freshness</UiInfoCardLabel>
              <UiInfoCardValue className="mt-1">
                <UiStatus tone={getFreshnessTone(indexingStatus.freshnessStatus)}>
                  {indexingStatus.freshnessStatus}
                </UiStatus>
              </UiInfoCardValue>
              <UiInfoCardMeta className="mt-2">Stale after {indexingStatus.staleAfterMinutes} minutes</UiInfoCardMeta>
            </UiInfoCard>
            <UiInfoCard>
              <UiInfoCardLabel>Last Success</UiInfoCardLabel>
              <UiInfoCardValue>{formatTimestamp(indexingStatus.lastSuccessfulRun?.finishedAt ?? null)}</UiInfoCardValue>
            </UiInfoCard>
            <UiInfoCard>
              <UiInfoCardLabel>Last Run</UiInfoCardLabel>
              <UiInfoCardValue>{indexingStatus.lastRun?.status ?? 'Never'}</UiInfoCardValue>
              <UiInfoCardMeta>{formatTimestamp(indexingStatus.lastRun?.startedAt ?? null)}</UiInfoCardMeta>
            </UiInfoCard>
            <UiInfoCard>
              <UiInfoCardLabel>Execution</UiInfoCardLabel>
              <UiInfoCardValue>{indexingStatus.isRunning ? 'Running now' : 'Idle'}</UiInfoCardValue>
              {indexingStatus.lastRun?.status === 'failed' && indexingStatus.lastRun.errorMessage ? (
                <UiInfoCardError className="mt-2">{indexingStatus.lastRun.errorMessage}</UiInfoCardError>
              ) : null}
            </UiInfoCard>
          </CardContent>
        </Card>
      ) : null}

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
      {indexRuns.error ? <div className="text-destructive text-sm">{indexRuns.error.message}</div> : null}
      {assets.isPending ? <div className="text-muted-foreground text-sm">Loading assets...</div> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Index Runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!indexRuns.data?.indexRuns.length ? (
            <p className="text-muted-foreground text-sm">No index runs yet.</p>
          ) : (
            indexRuns.data.indexRuns.map((run) => (
              <div className="grid gap-2 rounded-lg border p-3 text-sm md:grid-cols-5" key={run.id}>
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <div>{run.status}</div>
                  <div className="text-muted-foreground text-xs">{run.triggerSource}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Started</div>
                  <div>{formatTimestamp(run.startedAt)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Finished</div>
                  <div>{formatTimestamp(run.finishedAt)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Counts</div>
                  <div>{`pages ${run.pagesProcessed} · total ${run.totalCount}`}</div>
                  <div className="text-muted-foreground text-xs">
                    {`+${run.insertedCount} / ~${run.updatedCount} / -${run.deletedCount}`}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Resolver</div>
                  <div>{run.resolverKind}</div>
                  {run.errorMessage ? <div className="text-destructive mt-1 text-xs">{run.errorMessage}</div> : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

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
