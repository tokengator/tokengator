import type { ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { Shield } from 'lucide-react'
import type { ProfileUserEntity } from '@tokengator/sdk'
import { Button } from '@tokengator/ui/components/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { Tabs, TabsList, TabsTrigger } from '@tokengator/ui/components/tabs'

import { ProfileUiItem } from '@/features/profile/ui/profile-ui-item.tsx'
import { ShellUiDebugButton } from '@/features/shell/ui/shell-ui-debug-button.tsx'

const baseProfileTabs = [
  {
    label: 'Identities',
    to: '/profile/$username/identities',
    value: 'identities',
  },
  {
    label: 'Assets',
    to: '/profile/$username/assets',
    value: 'assets',
  },
] as const

function getCurrentTab(pathname: string): 'assets' | 'identities' | 'settings' {
  const segments = pathname.split('/').filter(Boolean)
  const lastSegment = segments.at(-1)

  if (lastSegment === 'assets' || lastSegment === 'identities' || lastSegment === 'settings') {
    return lastSegment
  }

  return 'identities'
}

export function ProfileFeatureShell({
  children,
  isAdmin,
  isOwner,
  user,
}: {
  children: ReactNode
  isAdmin: boolean
  isOwner: boolean
  user: ProfileUserEntity | null
}) {
  const location = useLocation()
  const currentTab = getCurrentTab(location.pathname)
  const profileTabs = isOwner
    ? [
        ...baseProfileTabs,
        {
          label: 'Settings',
          to: '/profile/$username/settings',
          value: 'settings' as const,
        },
      ]
    : baseProfileTabs

  return (
    <div className="min-h-full overflow-y-auto px-4 py-6">
      <div className="mx-auto w-full max-w-xl">
        {user ? (
          <div className="grid gap-6">
            <ProfileUiItem
              action={
                <>
                  {isAdmin ? (
                    <Button
                      aria-label="Open admin user detail"
                      nativeButton={false}
                      render={<Link params={{ userId: user.id }} to="/admin/users/$userId" />}
                      size="icon-sm"
                      title="Open admin user detail"
                      variant="outline"
                    >
                      <Shield />
                    </Button>
                  ) : null}
                  <ShellUiDebugButton data={user} label="Profile debug data" />
                </>
              }
              user={user}
            />
            <Tabs value={currentTab}>
              <TabsList className="w-full justify-start">
                {profileTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    nativeButton={false}
                    render={<Link params={{ username: user.username }} to={tab.to} />}
                    value={tab.value}
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {children}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>User Not Found</CardTitle>
              <CardDescription>The requested user could not be loaded.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  )
}
