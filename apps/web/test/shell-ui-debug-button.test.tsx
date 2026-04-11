import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

let developerMode = false
let ShellUiDebugButton: typeof import('../src/features/shell/ui/shell-ui-debug-button').ShellUiDebugButton

beforeAll(async () => {
  mock.module('@/features/auth/data-access/use-app-auth-state-query', () => ({
    useAppAuthStateQuery: () => ({
      data: {
        profileSettings: {
          settings: {
            developerMode,
          },
        },
      },
    }),
  }))

  ;({ ShellUiDebugButton } = await import('../src/features/shell/ui/shell-ui-debug-button'))
})

beforeEach(() => {
  developerMode = false
})

afterAll(() => {
  mock.restore()
})

function renderDebugButton() {
  return renderToStaticMarkup(<ShellUiDebugButton data={{ role: 'user' }} label="Profile debug data" />)
}

describe('ShellUiDebugButton', () => {
  test('hides the debug button when developer mode is disabled', () => {
    developerMode = false

    expect(renderDebugButton()).toBe('')
  })

  test('renders the debug button when developer mode is enabled', () => {
    developerMode = true

    expect(renderDebugButton()).toContain('Profile debug data')
  })
})
