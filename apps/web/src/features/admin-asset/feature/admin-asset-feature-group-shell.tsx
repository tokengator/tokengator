import type { ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { Tabs, TabsList, TabsTrigger } from '@tokengator/ui/components/tabs'

import { useAdminAssetGroupGetQuery } from '../data-access/use-admin-asset-group-get-query'

const assetGroupTabs = [
  {
    label: 'Assets',
    to: '/admin/assets/$assetGroupId/assets',
    value: 'assets',
  },
  {
    label: 'Settings',
    to: '/admin/assets/$assetGroupId/settings',
    value: 'settings',
  },
] as const

function getCurrentTab(pathname: string) {
  if (pathname.endsWith('/settings')) {
    return 'settings'
  }

  return 'assets'
}

interface AdminAssetFeatureGroupShellProps {
  assetGroupId: string
  children: ReactNode
}

export function AdminAssetFeatureGroupShell(props: AdminAssetFeatureGroupShellProps) {
  const { assetGroupId, children } = props
  const assetGroup = useAdminAssetGroupGetQuery(assetGroupId)
  const location = useLocation()
  const currentTab = getCurrentTab(location.pathname)

  if (!assetGroup.isPending && !assetGroup.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asset Group Not Found</CardTitle>
          <CardDescription>The requested asset group could not be loaded.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <Link
            className="text-muted-foreground hover:text-foreground text-sm"
            search={{
              limit: 25,
              offset: 0,
            }}
            to="/admin/assets"
          >
            Back to assets
          </Link>
          {assetGroup.data ? (
            <>
              <h2 className="text-lg font-medium">{assetGroup.data.label}</h2>
              <p className="text-muted-foreground text-sm">
                {assetGroup.data.type} / {assetGroup.data.address}
              </p>
            </>
          ) : (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading asset group
            </div>
          )}
        </div>
      </div>

      <Tabs value={currentTab}>
        <TabsList className="w-full justify-start">
          {assetGroupTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              nativeButton={false}
              render={
                <Link
                  params={{
                    assetGroupId,
                  }}
                  to={tab.to}
                />
              }
              value={tab.value}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {assetGroup.data ? (
        children
      ) : (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading asset group
        </div>
      )}
    </div>
  )
}
