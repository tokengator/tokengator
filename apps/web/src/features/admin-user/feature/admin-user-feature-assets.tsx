import { Loader2 } from 'lucide-react'

import { useAdminUserAssetsQuery } from '../data-access/use-admin-user-assets-query'
import { AdminUserAssetsUiTable } from '../ui/admin-user-assets-ui-table'

export function AdminUserFeatureAssets({ userId }: { userId: string }) {
  const assets = useAdminUserAssetsQuery({
    userId,
  })

  if (assets.error) {
    return <div className="text-destructive text-sm">{assets.error.message}</div>
  }

  if (assets.isPending) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading assets
      </div>
    )
  }

  return <AdminUserAssetsUiTable assets={assets.data?.assets ?? []} />
}
