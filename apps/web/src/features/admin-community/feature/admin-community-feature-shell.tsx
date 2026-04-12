import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import type { AdminOrganizationDetailEntity } from '@tokengator/sdk'

import { CommunityUiItem } from '@/features/community/ui/community-ui-item'

import { Card, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { Tabs, TabsList, TabsTrigger } from '@tokengator/ui/components/tabs'

import { useAdminCommunityGetQuery } from '../data-access/use-admin-community-get-query'

const organizationTabs = [
  {
    label: 'Overview',
    to: '/admin/communities/$organizationId/overview',
    value: 'overview',
  },
  {
    label: 'Members',
    to: '/admin/communities/$organizationId/members',
    value: 'members',
  },
  {
    label: 'Roles',
    to: '/admin/communities/$organizationId/roles',
    value: 'roles',
  },
  {
    label: 'Discord',
    to: '/admin/communities/$organizationId/discord',
    value: 'discord',
  },
  {
    label: 'Operations',
    to: '/admin/communities/$organizationId/operations',
    value: 'operations',
  },
  {
    label: 'Settings',
    to: '/admin/communities/$organizationId/settings',
    value: 'settings',
  },
] as const

function getCurrentTab(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  const lastSegment = segments.at(-1)
  const activeTab = organizationTabs.find((tab) => tab.value === lastSegment)

  return activeTab?.value ?? null
}

export function AdminCommunityFeatureShell({
  children,
  initialOrganization,
}: {
  children: ReactNode
  initialOrganization: AdminOrganizationDetailEntity | null
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const currentTab = getCurrentTab(location.pathname) ?? organizationTabs[0].value
  const organizationId = initialOrganization?.id ?? ''
  const { data, isPending } = useAdminCommunityGetQuery(organizationId, {
    initialData: initialOrganization ?? undefined,
  })

  if (!initialOrganization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Community Not Found</CardTitle>
          <CardDescription>The requested community could not be loaded.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!isPending && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Community Not Found</CardTitle>
          <CardDescription>The requested community could not be loaded.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <Link className="text-muted-foreground hover:text-foreground text-sm" to="/admin/communities">
            Back to communities
          </Link>
          {data ? (
            <CommunityUiItem
              community={data}
              title={<span className="text-lg font-medium">{data.name}</span>}
              variant="default"
            />
          ) : (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading community
            </div>
          )}
        </div>
      </div>

      <Tabs
        onValueChange={(value) => {
          const nextTab = organizationTabs.find((tab) => tab.value === value)

          if (!nextTab || nextTab.value === currentTab) {
            return
          }

          void navigate({
            params: { organizationId },
            to: nextTab.to,
          })
        }}
        value={currentTab}
      >
        <TabsList className="w-full justify-start">
          {organizationTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              nativeButton={false}
              render={<Link params={{ organizationId }} to={tab.to} />}
              value={tab.value}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {data ? (
        children
      ) : (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading community
        </div>
      )}
    </div>
  )
}
