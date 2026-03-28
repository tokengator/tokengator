import type { ReactNode } from 'react'

interface AdminAssetGroupUiTableAssetGroup {
  address: string
  enabled: boolean
  id: string
  label: string
  type: 'collection' | 'mint'
}

interface AdminAssetGroupUiTableProps {
  assetGroups: AdminAssetGroupUiTableAssetGroup[]
  renderActions: (assetGroup: AdminAssetGroupUiTableAssetGroup) => ReactNode
  renderLabel?: (assetGroup: AdminAssetGroupUiTableAssetGroup) => ReactNode
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
    <div className="overflow-x-auto border">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="border-b px-3 py-2 font-medium">Label</th>
            <th className="border-b px-3 py-2 font-medium">Type</th>
            <th className="border-b px-3 py-2 font-medium">Address</th>
            <th className="border-b px-3 py-2 font-medium">Status</th>
            <th className="border-b px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {assetGroups.map((assetGroup) => (
            <tr className="align-top" key={assetGroup.id}>
              <td className="border-b px-3 py-2 font-medium">
                {renderLabel ? renderLabel(assetGroup) : assetGroup.label}
              </td>
              <td className="border-b px-3 py-2">{assetGroup.type}</td>
              <td className="border-b px-3 py-2 font-mono text-xs">{assetGroup.address}</td>
              <td className="border-b px-3 py-2">{assetGroup.enabled ? 'enabled' : 'disabled'}</td>
              <td className="border-b px-3 py-2 text-right">{renderActions(assetGroup)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
