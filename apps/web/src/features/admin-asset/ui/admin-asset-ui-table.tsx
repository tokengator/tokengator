import { Button } from '@tokengator/ui/components/button'

interface AdminAssetUiTableAsset {
  address: string
  amount: string
  id: string
  indexedAt: Date | string
  owner: string
  resolverKind: 'helius-collection-assets' | 'helius-token-accounts'
}

interface AdminAssetUiTableProps {
  assets: AdminAssetUiTableAsset[]
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
    <div className="overflow-x-auto border">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="border-b px-3 py-2 font-medium">Owner</th>
            <th className="border-b px-3 py-2 font-medium">Address</th>
            <th className="border-b px-3 py-2 font-medium">Resolver</th>
            <th className="border-b px-3 py-2 font-medium">Amount</th>
            <th className="border-b px-3 py-2 font-medium">Indexed</th>
            <th className="border-b px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr className="align-top" key={asset.id}>
              <td className="border-b px-3 py-2 font-mono text-xs">{asset.owner}</td>
              <td className="border-b px-3 py-2 font-mono text-xs">{asset.address}</td>
              <td className="border-b px-3 py-2">{asset.resolverKind}</td>
              <td className="border-b px-3 py-2">{asset.amount}</td>
              <td className="border-b px-3 py-2">{formatDate(asset.indexedAt)}</td>
              <td className="border-b px-3 py-2 text-right">
                <Button disabled={isDeletePending} onClick={() => onDelete(asset.id)} type="button" variant="outline">
                  {deletingAssetId === asset.id && isDeletePending ? 'Deleting...' : 'Delete'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
