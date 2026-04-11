import { beforeAll, describe, expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

let ProfileUiAccountCard: typeof import('../src/features/profile/ui/profile-ui-account-card').ProfileUiAccountCard

beforeAll(async () => {
  mock.module('@/features/auth/data-access/use-app-auth-state-query', () => ({
    useAppAuthStateQuery: () => ({
      data: {
        profileSettings: {
          settings: {
            developerMode: false,
          },
        },
      },
    }),
  }))

  ;({ ProfileUiAccountCard } = await import('../src/features/profile/ui/profile-ui-account-card'))
})

describe('ProfileUiAccountCard', () => {
  test('renders the user role fallback when the session role is missing', () => {
    const markup = renderToStaticMarkup(
      <ProfileUiAccountCard
        user={{
          id: 'user-1',
          name: 'Alice',
          role: null,
          username: 'alice',
        }}
      />,
    )

    expect(markup).toContain('>user<')
  })
})
