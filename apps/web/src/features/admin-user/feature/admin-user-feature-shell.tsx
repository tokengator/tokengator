import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import type { AdminUserDetailEntity } from '@tokengator/sdk'
import { Card, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { Tabs, TabsList, TabsTrigger } from '@tokengator/ui/components/tabs'

import { useAdminUserGetQuery } from '../data-access/use-admin-user-get-query'

const userTabs = [
  {
    label: 'Overview',
    to: '/admin/users/$userId/overview',
    value: 'overview',
  },
  {
    label: 'Identities',
    to: '/admin/users/$userId/identities',
    value: 'identities',
  },
  {
    label: 'Communities',
    to: '/admin/users/$userId/communities',
    value: 'communities',
  },
  {
    label: 'Assets',
    to: '/admin/users/$userId/assets',
    value: 'assets',
  },
  {
    label: 'Settings',
    to: '/admin/users/$userId/settings',
    value: 'settings',
  },
] as const

function getCurrentTab(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  const lastSegment = segments.at(-1)
  const activeTab = userTabs.find((tab) => tab.value === lastSegment)

  return activeTab?.value ?? null
}

export function AdminUserFeatureShell({
  children,
  initialUser,
}: {
  children: ReactNode
  initialUser: AdminUserDetailEntity | null
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const currentTab = getCurrentTab(location.pathname) ?? userTabs[0].value
  const userId = initialUser?.id ?? ''
  const { data, isPending } = useAdminUserGetQuery(userId, {
    initialData: initialUser ?? undefined,
  })

  if (!initialUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Not Found</CardTitle>
          <CardDescription>The requested user could not be loaded.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!isPending && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Not Found</CardTitle>
          <CardDescription>The requested user could not be loaded.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <Link className="text-muted-foreground hover:text-foreground text-sm" to="/admin/users">
            Back to users
          </Link>
          {data ? (
            <>
              <h2 className="text-lg font-medium">{data.name}</h2>
              <p className="text-muted-foreground text-sm">
                {data.username ? `@${data.username} · ` : ''}
                {data.email}
              </p>
            </>
          ) : (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading user
            </div>
          )}
        </div>
      </div>

      <Tabs
        onValueChange={(value) => {
          const nextTab = userTabs.find((tab) => tab.value === value)

          if (!nextTab || nextTab.value === currentTab) {
            return
          }

          void navigate({
            params: { userId },
            to: nextTab.to,
          })
        }}
        value={currentTab}
      >
        <TabsList className="w-full justify-start">
          {userTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              nativeButton={false}
              render={<Link params={{ userId }} to={tab.to} />}
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
          Loading user
        </div>
      )}
    </div>
  )
}
