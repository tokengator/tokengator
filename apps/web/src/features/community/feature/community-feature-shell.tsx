import type { ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import type { CommunityGetBySlugResult } from '@tokengator/sdk'

import { Card, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { Tabs, TabsList, TabsTrigger } from '@tokengator/ui/components/tabs'

import { CommunityUiItem } from '../ui/community-ui-item'

const communityTabs = [
  {
    label: 'Overview',
    to: '/communities/$slug/overview',
    value: 'overview',
  },
  {
    label: 'Collections',
    to: '/communities/$slug/collections',
    value: 'collections',
  },
] as const

export function getCommunityCurrentTab(pathname: string) {
  if (pathname.includes('/collections/') || pathname.endsWith('/collections')) {
    return 'collections'
  }

  return 'overview'
}

export function CommunityFeatureShell({
  children,
  initialCommunity,
}: {
  children: ReactNode
  initialCommunity: CommunityGetBySlugResult | null
}) {
  const location = useLocation()
  const currentTab = getCommunityCurrentTab(location.pathname)

  if (!initialCommunity) {
    return (
      <div className="min-h-full overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[96rem]">
          <Card>
            <CardHeader>
              <CardTitle>Community Not Found</CardTitle>
              <CardDescription>The requested community could not be loaded.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full overflow-y-auto px-4 py-6 sm:px-6">
      <div className="mx-auto grid w-full max-w-6xl gap-6 xl:max-w-7xl 2xl:max-w-[96rem]">
        <div className="grid gap-3">
          <Link className="text-muted-foreground hover:text-foreground text-sm" to="/communities">
            Back to communities
          </Link>
          <CommunityUiItem
            community={initialCommunity}
            title={<span className="text-lg font-medium">{initialCommunity.name}</span>}
            variant="default"
          />
        </div>
        <Tabs value={currentTab}>
          <TabsList className="w-full justify-start">
            {communityTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                nativeButton={false}
                render={<Link params={{ slug: initialCommunity.slug }} to={tab.to} />}
                value={tab.value}
              >
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
