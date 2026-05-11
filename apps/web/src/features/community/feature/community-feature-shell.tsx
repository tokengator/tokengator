import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { Shield } from 'lucide-react'
import type { ReactNode } from 'react'
import type { CommunityGetBySlugResult, CommunityListResult } from '@tokengator/sdk'

import { Button } from '@tokengator/ui/components/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { Tabs, TabsList, TabsTrigger } from '@tokengator/ui/components/tabs'

import { ShellUiDebugButton } from '@/features/shell/ui/shell-ui-debug-button.tsx'

import { useCommunityListQuery } from '../data-access/use-community-list-query'
import { CommunityUiSwitcherCombobox } from '../ui/community-ui-switcher-combobox'

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

export function getCommunitySwitchNavigation({
  slug,
  tab,
}: {
  slug: string
  tab: ReturnType<typeof getCommunityCurrentTab>
}) {
  return {
    params: {
      slug,
    },
    to: tab === 'collections' ? '/communities/$slug/collections' : '/communities/$slug/overview',
  } as const
}

export function CommunityFeatureShell({
  children,
  initialCommunities,
  initialCommunity,
  isAdmin,
}: {
  children: ReactNode
  initialCommunities: CommunityListResult
  initialCommunity: CommunityGetBySlugResult | null
  isAdmin: boolean
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const communities = useCommunityListQuery({
    initialData: initialCommunities,
  })
  const currentTab = getCommunityCurrentTab(location.pathname)

  if (!initialCommunity) {
    return (
      <div className="min-h-full overflow-y-auto px-4 py-6">
        <div className="mx-auto w-full max-w-6xl">
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
    <div className="min-h-full overflow-y-auto px-4 py-6">
      <div className="mx-auto grid w-full max-w-6xl gap-6">
        <div className="flex items-center justify-between gap-3">
          <CommunityUiSwitcherCombobox
            communities={communities.data?.communities ?? initialCommunities.communities}
            onAllCommunitiesSelect={() => {
              void navigate({ to: '/communities' })
            }}
            onCommunitySelect={(slug) => {
              void navigate(getCommunitySwitchNavigation({ slug, tab: currentTab }))
            }}
            selectedCommunity={initialCommunity}
          />
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <Button
                aria-label="Open admin community detail"
                nativeButton={false}
                render={
                  <Link params={{ organizationId: initialCommunity.id }} to="/admin/communities/$organizationId" />
                }
                size="icon-sm"
                title="Open admin community detail"
                variant="outline"
              >
                <Shield />
              </Button>
            ) : null}
            <ShellUiDebugButton data={initialCommunity} label="Community debug data" />
          </div>
        </div>
        <Tabs value={currentTab}>
          <TabsList className="justify-start gap-8 p-0" variant="line">
            {communityTabs.map((tab) => (
              <TabsTrigger
                className="flex-none rounded-none px-0 py-2 text-xs font-semibold uppercase data-active:after:shadow-[0_7px_14px_1px_color-mix(in_oklch,var(--foreground)_35%,transparent)]"
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
