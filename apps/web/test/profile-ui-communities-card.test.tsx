import type { ReactNode } from 'react'
import * as TanStackReactRouter from '@tanstack/react-router'
import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

let ProfileUiCommunitiesCard: typeof import('../src/features/profile/ui/profile-ui-communities-card').ProfileUiCommunitiesCard

function getMockLinkHref(input: { params?: Record<string, string>; search?: Record<string, unknown>; to: string }) {
  let href = input.to

  for (const [key, value] of Object.entries(input.params ?? {}).sort(([left], [right]) => left.localeCompare(right))) {
    href = href.replace(`$${key}`, value)
  }

  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(input.search ?? {}).sort(([left], [right]) => left.localeCompare(right))) {
    if (value === undefined) {
      continue
    }

    searchParams.set(key, String(value))
  }

  const search = searchParams.toString()

  return search ? `${href}?${search}` : href
}

function MockLink({
  children,
  className,
  params,
  search,
  to,
}: {
  children: ReactNode
  className?: string
  params?: Record<string, string>
  search?: Record<string, unknown>
  to: string
}) {
  return (
    <a className={className} href={getMockLinkHref({ params, search, to })}>
      {children}
    </a>
  )
}

beforeAll(async () => {
  mock.module('@tanstack/react-router', () => ({
    ...TanStackReactRouter,
    Link: MockLink,
  }))

  ;({ ProfileUiCommunitiesCard } = await import('../src/features/profile/ui/profile-ui-communities-card'))
})

afterAll(() => {
  mock.restore()
})

describe('ProfileUiCommunitiesCard', () => {
  test('renders community cards with asset roles, collections before mints, owned assets, and empty states', () => {
    const markup = renderToStaticMarkup(
      <ProfileUiCommunitiesCard
        communities={[
          {
            assetRoles: [
              {
                assetGroups: [
                  {
                    address: 'mint-island',
                    id: 'asset-group-mint',
                    imageUrl: null,
                    label: 'Island Token',
                    maximumAmount: null,
                    minimumAmount: '1',
                    ownedAccounts: [
                      {
                        address: 'mint-island',
                        amount: '10',
                        id: 'mint-owned-alpha',
                        owner: 'wallet-alpha',
                      },
                      {
                        address: 'mint-island',
                        amount: '15',
                        id: 'mint-owned-beta',
                        owner: 'wallet-beta',
                      },
                    ],
                    ownedAmount: '25',
                    type: 'mint',
                  },
                  {
                    address: 'collection-perks',
                    id: 'asset-group-perks',
                    imageUrl: 'https://example.com/perks.png',
                    label: 'PERKS',
                    maximumAmount: null,
                    minimumAmount: '1',
                    ownedAssets: [
                      {
                        address: 'asset-owned-1-address',
                        amount: '1',
                        id: 'asset-owned-1',
                        metadataImageUrl: 'https://example.com/asset-owned-1.png',
                        metadataName: 'PEARK #100',
                        metadataSymbol: 'PEARK',
                        owner: 'wallet-alpha',
                        traits: [
                          {
                            groupId: 'background',
                            groupLabel: 'Background',
                            value: 'forest',
                            valueLabel: 'Forest',
                          },
                          {
                            groupId: 'hat',
                            groupLabel: 'Hat',
                            value: 'crown',
                            valueLabel: 'Crown',
                          },
                        ],
                      },
                    ],
                    type: 'collection',
                  },
                ],
                id: 'asset-role-1',
                matchMode: 'all',
                name: 'Perk Shark',
                slug: 'perk-shark',
              },
            ],
            gatedRoles: [
              {
                id: 'role-1',
                name: 'Genesis Holder',
                slug: 'genesis-holder',
              },
            ],
            id: 'org-1',
            logo: 'https://example.com/community.png',
            name: 'Alpha DAO',
            role: 'owner-admin',
            slug: 'alpha-dao',
          },
          {
            assetRoles: [],
            gatedRoles: [],
            id: 'org-2',
            logo: null,
            name: 'Beta DAO',
            role: 'member',
            slug: 'beta-dao',
          },
        ]}
      />,
    )

    expect(markup).toContain('Alpha DAO')
    expect(markup).toContain('@alpha-dao')
    expect(markup).toContain('href="/communities/alpha-dao"')
    expect(markup).toContain('owner admin')
    expect(markup).toContain('Perk Shark')
    expect(markup).toContain('rounded-full')
    expect(markup).toContain('PERKS')
    expect(markup).toContain('href="/communities/alpha-dao/collections/collection-perks?grid=8"')
    expect(markup).toContain('PEARK #100')
    expect(markup).toContain('data-slot="hover-card-trigger"')
    expect(markup).toContain('grid-cols-2')
    expect(markup).toContain('sm:grid-cols-4')
    expect(markup).toContain('Background: Forest')
    expect(markup).toContain('Hat: Crown')
    expect(markup).toContain('Island Token')
    expect(markup).toContain('Raw total amount')
    expect(markup).toContain('25')
    expect(markup).toContain('Wallet holding 1')
    expect(markup).toContain('wallet-alpha')
    expect(markup).toContain('Wallet holding 2')
    expect(markup).toContain('wallet-beta')
    expect(markup).toContain('Beta DAO')
    expect(markup).toContain('No asset-backed roles yet.')
    expect(markup).not.toContain('Genesis Holder')
    expect(markup).not.toContain('asset-owned-1-address')
    expect(markup.indexOf('Collection: PERKS')).toBeLessThan(markup.indexOf('Mint: Island Token'))
  })
})
