import { useAppAuthStateQuery } from '@/features/auth/data-access/use-app-auth-state-query'

import { useShellHealthCheckStatus } from '../data-access/use-shell-health-check-status'
import { ShellUiHeader } from '../ui/shell-ui-header'
import { ShellUiStatusIndicator } from '../ui/shell-ui-status-indicator'
import { ShellUiThemeToggle } from '../ui/shell-ui-theme-toggle'

import { ShellFeatureUserMenu } from './shell-feature-user-menu'

export function ShellFeatureHeader() {
  const { data } = useAppAuthStateQuery()
  const status = useShellHealthCheckStatus()
  const homeLink = data?.session ? data.authenticatedHomePath : '/'

  return (
    <ShellUiHeader
      actions={
        <>
          <ShellUiStatusIndicator status={status} />
          <ShellUiThemeToggle />
          <ShellFeatureUserMenu />
        </>
      }
      homeLink={homeLink}
    />
  )
}
