import { Link, useLocation } from '@tanstack/react-router'
import { Shield } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ProfileUserEntity } from '@tokengator/sdk'
import { Button } from '@tokengator/ui/components/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { Tabs, TabsList, TabsTrigger } from '@tokengator/ui/components/tabs'

import { useProfileByUsernameQuery } from '@/features/profile/data-access/use-profile-by-username-query.tsx'
import { ProfileUiItem } from '@/features/profile/ui/profile-ui-item.tsx'
import { ShellUiDebugButton } from '@/features/shell/ui/shell-ui-debug-button.tsx'

const baseProfileTabs = [
  {
    label: 'Assets',
    to: '/profile/$username/assets',
    value: 'assets',
  },
  {
    label: 'Identities',
    to: '/profile/$username/identities',
    value: 'identities',
  },
] as const

function getCurrentTab(pathname: string): 'assets' | 'identities' | 'settings' {
  const segments = pathname.split('/').filter(Boolean)
  const lastSegment = segments.at(-1)

  if (lastSegment === 'assets' || lastSegment === 'identities' || lastSegment === 'settings') {
    return lastSegment
  }

  return 'assets'
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
  const profile = useProfileByUsernameQuery(user?.username ?? '', {
    initialData: user,
  })
  const currentUser = profile.data ?? user
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
      <div className="mx-auto w-full max-w-6xl">
        {currentUser ? (
          <div className="grid gap-6">
            <ProfileUiItem
              action={
                <>
                  {isAdmin ? (
                    <Button
                      aria-label="Open admin user detail"
                      nativeButton={false}
                      render={<Link params={{ userId: currentUser.id }} to="/admin/users/$userId" />}
                      size="icon-sm"
                      title="Open admin user detail"
                      variant="outline"
                    >
                      <Shield />
                    </Button>
                  ) : null}
                  <ShellUiDebugButton data={currentUser} label="Profile debug data" />
                </>
              }
              className="gap-3 px-0 py-0"
              user={currentUser}
              variant="default"
            />
            <Tabs value={currentTab}>
              <TabsList className="justify-start gap-8 p-0" variant="line">
                {profileTabs.map((tab) => (
                  <TabsTrigger
                    className="flex-none rounded-none px-0 py-2 text-xs font-semibold uppercase data-active:after:shadow-[0_7px_14px_1px_color-mix(in_oklch,var(--foreground)_35%,transparent)]"
                    key={tab.value}
                    nativeButton={false}
                    render={<Link params={{ username: currentUser.username }} to={tab.to} />}
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
