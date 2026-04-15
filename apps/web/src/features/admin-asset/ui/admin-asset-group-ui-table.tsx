import type { ReactNode } from 'react'
import type { AdminAssetGroupWithIndexingStatus } from '@tokengator/sdk'

import { UiStatus } from '@tokengator/ui/components/ui-status'
import {
  UiTable,
  UiTableBody,
  UiTableCell,
  UiTableHead,
  UiTableHeaderCell,
  UiTableRow,
} from '@tokengator/ui/components/ui-table'
import { formatDateTime } from '@tokengator/ui/util/format-date-time'

import { getFreshnessTone } from '@/features/admin/util/get-freshness-tone'

interface AdminAssetGroupUiTableProps {
  assetGroups: AdminAssetGroupWithIndexingStatus[]
  renderActions: (assetGroup: AdminAssetGroupWithIndexingStatus) => ReactNode
  renderLabel?: (assetGroup: AdminAssetGroupWithIndexingStatus) => ReactNode
}

function AdminAssetGroupUiImage({ assetGroup }: { assetGroup: AdminAssetGroupWithIndexingStatus }) {
  const label = assetGroup.label.trim() || assetGroup.address

  return assetGroup.imageUrl ? (
    <img
      alt={label}
      className="bg-muted size-12 rounded-md border object-cover"
      loading="lazy"
      src={assetGroup.imageUrl}
    />
  ) : (
    <div aria-label={`${label} image placeholder`} className="bg-muted size-12 rounded-md border" role="img" />
  )
}

export function AdminAssetGroupUiTable(props: AdminAssetGroupUiTableProps) {
  const { assetGroups, renderActions, renderLabel } = props

  if (!assetGroups.length) {
    return (
      <div className="border p-6">
        <div className="font-medium">No asset groups found</div>
        <div className="text-muted-foreground text-sm">Create a group or adjust your search.</div>
      </div>
    )
  }

  return (
    <UiTable>
      <UiTableHead>
        <UiTableRow>
          <UiTableHeaderCell>Image</UiTableHeaderCell>
          <UiTableHeaderCell>Label</UiTableHeaderCell>
          <UiTableHeaderCell>Type</UiTableHeaderCell>
          <UiTableHeaderCell>Address</UiTableHeaderCell>
          <UiTableHeaderCell>Index Health</UiTableHeaderCell>
          <UiTableHeaderCell>Status</UiTableHeaderCell>
          <UiTableHeaderCell className="text-right">Actions</UiTableHeaderCell>
        </UiTableRow>
      </UiTableHead>
      <UiTableBody>
        {assetGroups.map((assetGroup) => (
          <UiTableRow className="align-top" key={assetGroup.id}>
            <UiTableCell>
              <AdminAssetGroupUiImage assetGroup={assetGroup} />
            </UiTableCell>
            <UiTableCell className="font-medium">
              {renderLabel ? renderLabel(assetGroup) : assetGroup.label}
            </UiTableCell>
            <UiTableCell>{assetGroup.type}</UiTableCell>
            <UiTableCell className="font-mono text-xs">{assetGroup.address}</UiTableCell>
            <UiTableCell>
              {assetGroup.indexingStatus ? (
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <UiStatus tone={getFreshnessTone(assetGroup.indexingStatus.freshnessStatus)}>
                      {assetGroup.indexingStatus.freshnessStatus}
                    </UiStatus>
                    {assetGroup.indexingStatus.isRunning ? (
                      <span className="text-muted-foreground text-xs">running</span>
                    ) : null}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Last success: {formatDateTime(assetGroup.indexingStatus.lastSuccessfulRun?.finishedAt ?? null)}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Stale after: {assetGroup.indexingStatus.staleAfterMinutes}m
                  </div>
                  {assetGroup.indexingStatus.lastRun?.status === 'failed' &&
                  assetGroup.indexingStatus.lastRun.errorMessage ? (
                    <div className="text-destructive text-xs">{assetGroup.indexingStatus.lastRun.errorMessage}</div>
                  ) : null}
                </div>
              ) : (
                <UiStatus tone={getFreshnessTone('unknown')}>unknown</UiStatus>
              )}
            </UiTableCell>
            <UiTableCell>{assetGroup.enabled ? 'enabled' : 'disabled'}</UiTableCell>
            <UiTableCell className="text-right">{renderActions(assetGroup)}</UiTableCell>
          </UiTableRow>
        ))}
      </UiTableBody>
    </UiTable>
  )
}
