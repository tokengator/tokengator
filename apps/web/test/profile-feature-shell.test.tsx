import type { ReactNode } from 'react'
import * as TanStackReactRouter from '@tanstack/react-router'
import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

let ProfileFeatureShell: typeof import('../src/features/profile/feature/profile-feature-shell').ProfileFeatureShell

beforeAll(async () => {
  mock.module('@tanstack/react-router', () => ({
    ...TanStackReactRouter,
    Link: ({ children, title }: { children: ReactNode; title?: string }) => <a title={title}>{children}</a>,
    useLocation: () => ({
      pathname: '/profile/alice/identities',
    }),
  }))

  mock.module('../src/features/shell/ui/shell-ui-debug-button', () => ({
    ShellUiDebugButton: ({ label }: { label: string }) => <button type="button">{label}</button>,
  }))

  ;({ ProfileFeatureShell } = await import('../src/features/profile/feature/profile-feature-shell'))
})

afterAll(() => {
  mock.restore()
})

describe('ProfileFeatureShell', () => {
  test('hides the settings tab but still renders the debug action slot for non-owners', () => {
    const markup = renderToStaticMarkup(
      <ProfileFeatureShell
        isAdmin={false}
        isOwner={false}
        user={{ id: 'user-1', image: null, name: 'Alice', private: false, username: 'alice' }}
      >
        <div>Profile content</div>
      </ProfileFeatureShell>,
    )

    expect(markup).toContain('Identities')
    expect(markup).toContain('Assets')
    expect(markup).toContain('Profile content')
    expect(markup).toContain('Profile debug data')
    expect(markup).not.toContain('Open admin user detail')
    expect(markup).not.toContain('Settings')
  })

  test('shows the admin action, settings tab, and debug action for an admin owner', () => {
    const markup = renderToStaticMarkup(
      <ProfileFeatureShell
        isAdmin
        isOwner
        user={{ id: 'user-1', image: null, name: 'Alice', private: false, username: 'alice' }}
      >
        <div>Profile content</div>
      </ProfileFeatureShell>,
    )

    expect(markup).toContain('Open admin user detail')
    expect(markup).toContain('Profile debug data')
    expect(markup).toContain('Settings')
  })
})
