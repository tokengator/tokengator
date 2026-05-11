import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type { CommunityGetBySlugResult } from '@tokengator/sdk'

import { Card, CardHeader } from '@tokengator/ui/components/card'
import { Tabs, TabsList, TabsTrigger } from '@tokengator/ui/components/tabs'

import { CommunityUiCollectionCombobox } from '../ui/community-ui-collection-combobox'
import { getCommunityCollectionAssetMarketplace } from '../util/community-asset-marketplace'
import type { CommunityCollectionAssetSearch } from '../util/community-collection-asset-search'

export type CommunityCollectionTab = 'assets' | 'insights' | 'leaderboard' | 'marketplace'
type CommunityCollection = CommunityGetBySlugResult['collections'][number]

const communityCollectionTabs = [
  {
    label: 'Assets',
    to: '/communities/$slug/collections/$address',
    value: 'assets',
  },
  {
    label: 'Insights',
    to: '/communities/$slug/collections/$address/insights',
    value: 'insights',
  },
  {
    label: 'Leaderboard',
    to: '/communities/$slug/collections/$address/leaderboard',
    value: 'leaderboard',
  },
  {
    label: 'Marketplace',
    to: '/communities/$slug/collections/$address/marketplace',
    value: 'marketplace',
  },
] as const

function getCommunityCollectionTabTo(tab: CommunityCollectionTab) {
  return communityCollectionTabs.find((currentTab) => currentTab.value === tab)?.to ?? communityCollectionTabs[0].to
}

function getCommunityCollectionTabSearch(args: {
  search: CommunityCollectionAssetSearch
  tab: CommunityCollectionTab
}) {
  if (args.tab === 'assets') {
    return args.search
  }

  return {
    facets: undefined,
    grid: args.search.grid,
    owner: undefined,
    query: undefined,
  }
}

export function getCommunityCollectionCurrentTab(pathname: string): CommunityCollectionTab {
  const normalizedPathname = pathname.replace(/\/+$/, '')
  const segments = normalizedPathname.split('/').filter(Boolean)
  const tabSegment = segments[2] === 'collections' ? segments[4] : undefined

  if (tabSegment === 'insights') {
    return 'insights'
  }

  if (tabSegment === 'leaderboard') {
    return 'leaderboard'
  }

  if (tabSegment === 'marketplace') {
    return 'marketplace'
  }

  return 'assets'
}

function getCommunityCollectionSwitchTab(args: {
  address: string
  community?: CommunityGetBySlugResult
  tab: CommunityCollectionTab
}) {
  if (args.tab !== 'marketplace' || !args.community) {
    return args.tab
  }

  const nextCollection = args.community.collections.find((collection) => collection.address === args.address)

  if (
    nextCollection &&
    getCommunityCollectionAssetMarketplace({
      community: args.community,
      selectedCollection: nextCollection,
    })
  ) {
    return args.tab
  }

  return 'assets'
}

export function getCommunityCollectionSwitchNavigation(args: {
  address: string
  community?: CommunityGetBySlugResult
  search: CommunityCollectionAssetSearch
  slug: string
  tab: CommunityCollectionTab
}) {
  const tab = getCommunityCollectionSwitchTab(args)

  return {
    params: {
      address: args.address,
      slug: args.slug,
    },
    search: {
      facets: undefined,
      grid: args.search.grid,
      owner: args.tab === 'assets' && tab === 'assets' ? args.search.owner : undefined,
      query: undefined,
    },
    to: getCommunityCollectionTabTo(tab),
  }
}

export function getCommunityCollectionVisibleTabs(args: {
  community: CommunityGetBySlugResult
  selectedCollection: CommunityCollection
}) {
  const hasMarketplace = Boolean(
    getCommunityCollectionAssetMarketplace({
      community: args.community,
      selectedCollection: args.selectedCollection,
    }),
  )

  return communityCollectionTabs.filter((tab) => tab.value !== 'marketplace' || hasMarketplace)
}

export function CommunityFeatureCollectionShell({
  children,
  community,
  search,
  selectedCollection,
  slug,
}: {
  children: ReactNode
  community: CommunityGetBySlugResult
  search: CommunityCollectionAssetSearch
  selectedCollection: CommunityCollection
  slug: string
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const currentTab = getCommunityCollectionCurrentTab(location.pathname)
  const visibleTabs = getCommunityCollectionVisibleTabs({ community, selectedCollection })

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="gap-4">
          <CommunityUiCollectionCombobox
            collections={community.collections}
            onCollectionChange={(address) => {
              void navigate(
                getCommunityCollectionSwitchNavigation({
                  address,
                  community,
                  search,
                  slug,
                  tab: currentTab,
                }),
              )
            }}
            selectedCollectionAddress={selectedCollection.address}
          />
          <Tabs value={currentTab}>
            <TabsList className="justify-start gap-8 p-0" variant="line">
              {visibleTabs.map((tab) => (
                <TabsTrigger
                  className="flex-none rounded-none px-0 py-2 text-xs font-semibold uppercase data-active:after:shadow-[0_7px_14px_1px_color-mix(in_oklch,var(--foreground)_35%,transparent)]"
                  key={tab.value}
                  nativeButton={false}
                  render={
                    <Link
                      params={{
                        address: selectedCollection.address,
                        slug,
                      }}
                      search={getCommunityCollectionTabSearch({ search, tab: tab.value })}
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
        </CardHeader>
      </Card>
      {children}
    </div>
  )
}
