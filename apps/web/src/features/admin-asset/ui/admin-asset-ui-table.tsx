import type { AdminAssetEntity } from '@tokengator/sdk'
import { Button } from '@tokengator/ui/components/button'
import {
  UiTable,
  UiTableBody,
  UiTableCell,
  UiTableHead,
  UiTableHeaderCell,
  UiTableRow,
} from '@tokengator/ui/components/ui-table'

interface AdminAssetUiTableProps {
  assets: AdminAssetEntity[]
  deletingAssetId?: string
  isDeletePending: boolean
  onDelete: (id: string) => void
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString()
}

export function AdminAssetUiTable(props: AdminAssetUiTableProps) {
  const { assets, deletingAssetId, isDeletePending, onDelete } = props

  if (!assets.length) {
    return (
      <div className="border p-6">
        <div className="font-medium">No assets found</div>
        <div className="text-muted-foreground text-sm">Adjust the filters or index this group later.</div>
      </div>
    )
  }

  return (
    <UiTable>
      <UiTableHead>
        <UiTableRow>
          <UiTableHeaderCell>Owner</UiTableHeaderCell>
          <UiTableHeaderCell>Address</UiTableHeaderCell>
          <UiTableHeaderCell>Resolver</UiTableHeaderCell>
          <UiTableHeaderCell>Amount</UiTableHeaderCell>
          <UiTableHeaderCell>Indexed</UiTableHeaderCell>
          <UiTableHeaderCell className="text-right">Actions</UiTableHeaderCell>
        </UiTableRow>
      </UiTableHead>
      <UiTableBody>
        {assets.map((asset) => (
          <UiTableRow className="align-top" key={asset.id}>
            <UiTableCell className="font-mono text-xs">{asset.owner}</UiTableCell>
            <UiTableCell className="font-mono text-xs">{asset.address}</UiTableCell>
            <UiTableCell>{asset.resolverKind}</UiTableCell>
            <UiTableCell>{asset.amount}</UiTableCell>
            <UiTableCell>{formatDate(asset.indexedAt)}</UiTableCell>
            <UiTableCell className="text-right">
              <Button disabled={isDeletePending} onClick={() => onDelete(asset.id)} type="button" variant="outline">
                {deletingAssetId === asset.id && isDeletePending ? 'Deleting...' : 'Delete'}
              </Button>
            </UiTableCell>
          </UiTableRow>
        ))}
      </UiTableBody>
    </UiTable>
  )
}
