import type { OnboardingStatus } from '@/features/organization/feature/organization-feature-active-access'
import { useAppAuthStateQuery } from '@/features/auth/data-access/use-app-auth-state-query'
import { hasCompletedOnboarding } from '@/features/organization/feature/organization-feature-active-access'

import { useShellHealthCheckStatus } from '../data-access/use-shell-health-check-status'
import { ShellUiHeader } from '../ui/shell-ui-header'
import { ShellUiStatusIndicator } from '../ui/shell-ui-status-indicator'
import { ShellUiThemeToggle } from '../ui/shell-ui-theme-toggle'

import { ShellFeatureUserMenu } from './shell-feature-user-menu'

export function ShellFeatureHeader() {
  const { data } = useAppAuthStateQuery()
  const status = useShellHealthCheckStatus()
  const onboardingStatus: OnboardingStatus | null = data?.onboardingStatus ?? null
  const session = data?.session ?? null
  const isOnboarded = hasCompletedOnboarding(onboardingStatus)
  const homeLink = session ? (isOnboarded ? '/profile' : '/onboard') : '/'

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
