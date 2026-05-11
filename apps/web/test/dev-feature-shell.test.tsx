import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'
import * as TanStackReactRouter from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

let DevFeatureShell: typeof import('../src/features/dev/feature/dev-feature-shell').DevFeatureShell

beforeAll(async () => {
  mock.module('@tanstack/react-router', () => ({
    ...TanStackReactRouter,
    Link: ({ children, to }: { children: ReactNode; to?: string }) => <a href={to}>{children}</a>,
    useLocation: () => ({
      pathname: '/dev/backup',
    }),
    useNavigate: () => async () => undefined,
  }))

  ;({ DevFeatureShell } = await import('../src/features/dev/feature/dev-feature-shell'))
})

afterAll(() => {
  mock.restore()
})

describe('DevFeatureShell', () => {
  test('renders the backup tab alongside the existing dev tabs', () => {
    const markup = renderToStaticMarkup(
      <DevFeatureShell>
        <div>Child content</div>
      </DevFeatureShell>,
    )

    expect(markup).toContain('Development')
    expect(markup).toContain('API')
    expect(markup).toContain('Backup')
    expect(markup).toContain('href="/dev/backup"')
    expect(markup).toContain('Shadcn')
    expect(markup).toContain('UI')
    expect(markup).toContain('Wallets')
    expect(markup).toContain('Child content')
  })
})
