import type { ReactNode } from 'react'
import * as TanStackReactRouter from '@tanstack/react-router'
import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ProfileListCommunitiesByUsernameResult } from '@tokengator/sdk'

const viewerCommunities = {
  communities: [
    {
      assetRoles: [
        {
          assetGroups: [
            {
              address: 'collection-alpha',
              id: 'asset-group-collection',
              imageUrl: null,
              label: 'Alpha Collection',
              maximumAmount: null,
              minimumAmount: '1',
              ownedAssets: [
                {
                  address: 'asset-owned-1-address',
                  amount: '1',
                  id: 'asset-owned-1',
                  metadataImageUrl: null,
                  metadataName: 'PEARK #100',
                  metadataSymbol: null,
                  owner: 'wallet-alpha',
                  traits: [
                    {
                      groupId: 'background',
                      groupLabel: 'Background',
                      value: 'forest',
                      valueLabel: 'Forest',
                    },
                  ],
                },
              ],
              type: 'collection',
            },
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
                  amount: '25',
                  id: 'mint-owned-alpha',
                  owner: 'wallet-alpha',
                },
              ],
              ownedAmount: '25',
              type: 'mint',
            },
          ],
          id: 'role-collectors',
          matchMode: 'all',
          name: 'Collectors',
          slug: 'collectors',
        },
      ],
      gatedRoles: [],
      id: 'member-1',
      logo: null,
      name: 'Alpha DAO',
      role: 'member',
      slug: 'alpha-dao',
    },
  ],
} satisfies ProfileListCommunitiesByUsernameResult

let ProfileFeatureAssets: typeof import('../src/features/profile/feature/profile-feature-assets').ProfileFeatureAssets
let profileCommunitiesData: typeof viewerCommunities | null = viewerCommunities

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

  mock.module('../src/features/profile/data-access/use-profile-communities-by-username-query', () => ({
    useProfileCommunitiesByUsernameQuery: () => ({
      data: profileCommunitiesData,
      error: null,
      isPending: false,
    }),
  }))

  ;({ ProfileFeatureAssets } = await import('../src/features/profile/feature/profile-feature-assets'))
})

beforeEach(() => {
  profileCommunitiesData = viewerCommunities
})

afterAll(() => {
  mock.restore()
})

describe('ProfileFeatureAssets', () => {
  test('renders communities for non-owners when the profile is visible', () => {
    const markup = renderToStaticMarkup(
      <ProfileFeatureAssets
        initialCommunities={viewerCommunities}
        isOwner={false}
        isPrivate={false}
        username="alice"
      />,
    )

    expect(markup).toContain('Alpha DAO')
    expect(markup).toContain('href="/communities/alpha-dao"')
    expect(markup).toContain('Collectors')
    expect(markup).toContain('Alpha Collection')
    expect(markup).toContain('href="/communities/alpha-dao/collections/collection-alpha?grid=8"')
    expect(markup).toContain('PEARK #100')
    expect(markup).toContain('Background: Forest')
    expect(markup).toContain('Island Token')
    expect(markup).toContain('Raw total amount')
    expect(markup).toContain('25')
    expect(markup).toContain('Wallet holding 1')
    expect(markup).toContain('wallet-alpha')
    expect(markup).not.toContain('asset-owned-1-address')
  })

  test('renders a private profile notice instead of communities', () => {
    const markup = renderToStaticMarkup(
      <ProfileFeatureAssets initialCommunities={null} isOwner={false} isPrivate username="alice" />,
    )

    expect(markup).toContain('Private Profile')
    expect(markup).toContain('their profile details are private')
    expect(markup).not.toContain('Alpha DAO')
  })

  test('renders communities for owners from the username communities query', () => {
    const markup = renderToStaticMarkup(
      <ProfileFeatureAssets initialCommunities={viewerCommunities} isOwner isPrivate={false} username="alice" />,
    )

    expect(markup).toContain('Alpha DAO')
    expect(markup).toContain('href="/communities/alpha-dao"')
    expect(markup).toContain('Collectors')
    expect(markup).toContain('Alpha Collection')
    expect(markup).toContain('href="/communities/alpha-dao/collections/collection-alpha?grid=8"')
    expect(markup).toContain('PEARK #100')
    expect(markup).toContain('Background: Forest')
    expect(markup).toContain('Island Token')
    expect(markup).toContain('Raw total amount')
    expect(markup).toContain('25')
    expect(markup).toContain('Wallet holding 1')
    expect(markup).toContain('wallet-alpha')
    expect(markup).not.toContain('asset-owned-1-address')
  })
})
