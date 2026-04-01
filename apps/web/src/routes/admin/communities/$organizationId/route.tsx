import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { Tabs, TabsList, TabsTrigger } from '@tokengator/ui/components/tabs'

import { orpc } from '@/utils/orpc'

const organizationTabs = [
  {
    label: 'Overview',
    to: '/admin/communities/$organizationId',
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
    label: 'Settings',
    to: '/admin/communities/$organizationId/settings',
    value: 'settings',
  },
] as const

export function getAdminOrganizationQueryOptions(organizationId: string) {
  return orpc.adminOrganization.get.queryOptions({
    input: {
      organizationId,
    },
  })
}

export const Route = createFileRoute('/admin/communities/$organizationId')({
  component: RouteComponent,
})

function getCurrentTab(pathname: string) {
  if (pathname.endsWith('/members')) {
    return 'members'
  }

  if (pathname.endsWith('/roles')) {
    return 'roles'
  }

  if (pathname.endsWith('/settings')) {
    return 'settings'
  }

  return 'overview'
}

function RouteComponent() {
  const location = useLocation()
  const navigate = useNavigate()
  const { organizationId } = Route.useParams()
  const currentTab = getCurrentTab(location.pathname)
  const organization = useQuery(getAdminOrganizationQueryOptions(organizationId))

  if (!organization.isPending && !organization.data) {
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
          {organization.data ? (
            <>
              <h2 className="text-lg font-medium">{organization.data.name}</h2>
              <p className="text-muted-foreground text-sm">{organization.data.slug}</p>
            </>
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

      {organization.data ? (
        <Outlet />
      ) : (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading community
        </div>
      )}
    </div>
  )
}
