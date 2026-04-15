import { useAdminAssetGroupLookup } from '@/features/admin-asset/data-access/use-admin-asset-group-lookup'

import { useDevEcho } from '../data-access/use-dev-echo'
import { useDevUptimeQuery } from '../data-access/use-dev-uptime-query'
import { DevUiAssetGroupLookupCard } from '../ui/dev-ui-asset-group-lookup-card'
import { DevUiEchoCard } from '../ui/dev-ui-echo-card'
import { DevUiUptimeCard } from '../ui/dev-ui-uptime-card'

export function DevFeatureApi() {
  const assetGroupLookup = useAdminAssetGroupLookup()
  const echo = useDevEcho()
  const uptimeQuery = useDevUptimeQuery()

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <DevUiAssetGroupLookupCard
        data={assetGroupLookup.data}
        errorMessage={assetGroupLookup.error?.message ?? null}
        isPending={assetGroupLookup.isPending}
        lookupAssetGroup={(address) => assetGroupLookup.mutate({ address })}
        suggestion={assetGroupLookup.data?.suggestion}
        warnings={assetGroupLookup.data?.warnings ?? []}
      />
      <DevUiUptimeCard
        data={uptimeQuery.data}
        errorMessage={uptimeQuery.error?.message ?? null}
        isFetching={uptimeQuery.isFetching}
        refresh={() => void uptimeQuery.refetch()}
      />
      <DevUiEchoCard
        data={echo.data}
        errorMessage={echo.error?.message ?? null}
        isPending={echo.isPending}
        sendEcho={(text) => echo.mutate({ text })}
      />
    </div>
  )
}
