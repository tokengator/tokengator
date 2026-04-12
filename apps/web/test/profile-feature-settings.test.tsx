import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

let appAuthStateDeveloperMode = false
let profileSettingsData: { settings: { developerMode: boolean; private: boolean } } | undefined
let profileSettingsPending = false
let ProfileFeatureSettings: typeof import('../src/features/profile/feature/profile-feature-settings').ProfileFeatureSettings

beforeAll(async () => {
  mock.module('@/features/auth/data-access/use-app-auth-state-query', () => ({
    useAppAuthStateQuery: () => ({
      data: {
        profileSettings: {
          settings: {
            developerMode: appAuthStateDeveloperMode,
            private: false,
          },
        },
      },
    }),
  }))

  mock.module('@/features/auth/data-access/use-app-session', () => ({
    useAppSession: () => ({
      data: {
        user: {
          id: 'user-1',
        },
      },
    }),
  }))

  mock.module('../src/features/profile/data-access/use-profile-get-settings', () => ({
    useProfileSettings: () => ({
      data: profileSettingsData,
      isPending: profileSettingsPending,
    }),
  }))

  mock.module('../src/features/profile/data-access/use-profile-update-settings', () => ({
    useProfileUpdateSettings: () => ({
      isPending: false,
      pendingSettings: null,
      updateSettings: async () => {},
    }),
  }))

  ;({ ProfileFeatureSettings } = await import('../src/features/profile/feature/profile-feature-settings'))
})

afterAll(() => {
  mock.restore()
})

describe('ProfileFeatureSettings', () => {
  test('uses app auth state as the initial SSR source for developer mode', () => {
    appAuthStateDeveloperMode = true
    profileSettingsData = undefined
    profileSettingsPending = true

    const markup = renderToStaticMarkup(<ProfileFeatureSettings />)

    expect(markup).toContain('aria-checked="true"')
    expect(markup).not.toContain('aria-disabled="true"')
  })
})
