import type { ReactNode } from 'react'
import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

let ShellUiSignedInUserMenu: typeof import('../src/features/shell/ui/shell-ui-signed-in-user-menu').ShellUiSignedInUserMenu

beforeAll(async () => {
  mock.module('@tokengator/ui/components/dropdown-menu', () => ({
    DropdownMenu: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    DropdownMenuGroup: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    DropdownMenuItem: ({ children }: { children?: ReactNode }) => <button type="button">{children}</button>,
    DropdownMenuLabel: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuTrigger: ({ children }: { children?: ReactNode }) => <button type="button">{children}</button>,
  }))

  ;({ ShellUiSignedInUserMenu } = await import('../src/features/shell/ui/shell-ui-signed-in-user-menu'))
})

afterAll(() => {
  mock.restore()
})

describe('ShellUiSignedInUserMenu', () => {
  test('renders the Communities menu entry for signed-in users', () => {
    const markup = renderToStaticMarkup(
      <ShellUiSignedInUserMenu
        onAdminClick={() => undefined}
        onCommunitiesClick={() => undefined}
        onDevelopmentClick={() => undefined}
        onProfileClick={() => undefined}
        onSignOut={() => undefined}
        session={{
          user: {
            id: 'user-1',
            name: 'Alice Example',
            role: 'admin',
            username: 'alice',
          },
        }}
      />,
    )

    expect(markup).toContain('Communities')
    expect(markup).toContain('Profile')
  })
})
