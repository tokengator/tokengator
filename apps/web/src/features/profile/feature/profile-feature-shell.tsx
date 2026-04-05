import type { ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { Tabs, TabsList, TabsTrigger } from '@tokengator/ui/components/tabs'

import { useAppSession } from '@/features/auth/data-access/use-app-session'
import { ProfileUiAccountCard } from '../ui/profile-ui-account-card'

const profileTabs = [
  {
    label: 'Identities',
    to: '/profile/identities',
    value: 'identities',
  },
  {
    label: 'Assets',
    to: '/profile/assets',
    value: 'assets',
  },
  {
    label: 'Settings',
    to: '/profile/settings',
    value: 'settings',
  },
] as const

function getCurrentTab(pathname: string): (typeof profileTabs)[number]['value'] {
  const matchedTab = profileTabs.find((tab) => pathname.endsWith(tab.to))

  return matchedTab?.value ?? 'identities'
}

export function ProfileFeatureShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { data: session } = useAppSession()
  const currentTab = getCurrentTab(location.pathname)

  if (!session) {
    return null
  }

  return (
    <div className="min-h-full overflow-y-auto px-4 py-6">
      <div className="mx-auto grid w-full max-w-xl gap-6">
        <ProfileUiAccountCard
          name={session.user.name}
          role={session.user.role ?? 'user'}
          username={session.user.username}
        />

        <Tabs value={currentTab}>
          <TabsList className="w-full justify-start">
            {profileTabs.map((tab) => (
              <TabsTrigger key={tab.value} nativeButton={false} render={<Link to={tab.to} />} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {children}
      </div>
    </div>
  )
}
