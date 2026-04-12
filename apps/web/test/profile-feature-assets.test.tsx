import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

const viewerCommunities = {
  communities: [
    {
      gatedRoles: [],
      id: 'member-1',
      logo: null,
      name: 'Alpha DAO',
      role: 'member',
      slug: 'alpha-dao',
    },
  ],
}

let ProfileFeatureAssets: typeof import('../src/features/profile/feature/profile-feature-assets').ProfileFeatureAssets
let profileCommunitiesData: typeof viewerCommunities | null = viewerCommunities

beforeAll(async () => {
  mock.module('../src/features/auth/data-access/use-app-session', () => ({
    useAppSession: () => ({
      data: {
        user: {
          id: 'owner-user-id',
        },
      },
    }),
  }))

  mock.module('../src/features/organization/data-access/use-organization-list-mine', () => ({
    useOrganizationListMine: () => ({
      data: {
        organizations: [],
      },
      isPending: false,
    }),
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
        initialOrganizationListMine={null}
        isOwner={false}
        isPrivate={false}
        username="alice"
      />,
    )

    expect(markup).toContain('Alpha DAO')
    expect(markup).toContain('Communities this user belongs to in TokenGator.')
  })

  test('renders a private profile notice instead of communities', () => {
    const markup = renderToStaticMarkup(
      <ProfileFeatureAssets
        initialCommunities={null}
        initialOrganizationListMine={null}
        isOwner={false}
        isPrivate
        username="alice"
      />,
    )

    expect(markup).toContain('Private Profile')
    expect(markup).toContain('their profile details are private')
    expect(markup).not.toContain('Alpha DAO')
  })
})
