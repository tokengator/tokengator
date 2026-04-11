import type { AdminUserAssetEntity } from '@tokengator/sdk'
import {
  UiTable,
  UiTableBody,
  UiTableCell,
  UiTableHead,
  UiTableHeaderCell,
  UiTableRow,
} from '@tokengator/ui/components/ui-table'

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString()
}

export function AdminUserAssetsUiTable({ assets }: { assets: AdminUserAssetEntity[] }) {
  if (!assets.length) {
    return (
      <div className="border p-6">
        <div className="font-medium">No assets found</div>
        <div className="text-muted-foreground text-sm">
          This user does not currently own indexed assets through linked wallets.
        </div>
      </div>
    )
  }

  return (
    <UiTable>
      <UiTableHead>
        <UiTableRow>
          <UiTableHeaderCell>Name</UiTableHeaderCell>
          <UiTableHeaderCell>Address</UiTableHeaderCell>
          <UiTableHeaderCell>Owner</UiTableHeaderCell>
          <UiTableHeaderCell>Resolver</UiTableHeaderCell>
          <UiTableHeaderCell>Amount</UiTableHeaderCell>
          <UiTableHeaderCell>Indexed</UiTableHeaderCell>
        </UiTableRow>
      </UiTableHead>
      <UiTableBody>
        {assets.map((asset) => (
          <UiTableRow className="align-top" key={asset.id}>
            <UiTableCell>{asset.metadataName ?? 'Unnamed asset'}</UiTableCell>
            <UiTableCell className="font-mono text-xs">{asset.address}</UiTableCell>
            <UiTableCell className="font-mono text-xs">{asset.owner}</UiTableCell>
            <UiTableCell>{asset.resolverKind}</UiTableCell>
            <UiTableCell>{asset.amount}</UiTableCell>
            <UiTableCell>{formatDate(asset.indexedAt)}</UiTableCell>
          </UiTableRow>
        ))}
      </UiTableBody>
    </UiTable>
  )
}
