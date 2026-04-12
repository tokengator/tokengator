import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { ProfileUiCommunitiesCard } from '../src/features/profile/ui/profile-ui-communities-card'

describe('ProfileUiCommunitiesCard', () => {
  test('renders the community avatar, role metadata, and gated roles', () => {
    const markup = renderToStaticMarkup(
      <ProfileUiCommunitiesCard
        communities={[
          {
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
        ]}
      />,
    )

    expect(markup).toContain('Alpha DAO')
    expect(markup).toContain('@alpha-dao')
    expect(markup).toContain('owner admin')
    expect(markup).toContain('Genesis Holder')
  })
})
