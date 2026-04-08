import type { OnboardingStatus } from '@/features/organization/feature/organization-feature-active-access'
import { useAppAuthStateQuery } from '@/features/auth/data-access/use-app-auth-state-query'
import { hasCompletedOnboarding } from '@/features/organization/feature/organization-feature-active-access'

import { useShellHealthCheckQuery } from '../data-access/use-shell-health-check-query'
import { ShellUiHeader } from '../ui/shell-ui-header'
import { ShellUiStatusIndicator } from '../ui/shell-ui-status-indicator'
import { ShellUiThemeToggle } from '../ui/shell-ui-theme-toggle'

import { ShellFeatureUserMenu } from './shell-feature-user-menu'

export function ShellFeatureHeader() {
  const { data } = useAppAuthStateQuery()
  const healthCheck = useShellHealthCheckQuery()
  const onboardingStatus: OnboardingStatus | null = data?.onboardingStatus ?? null
  const session = data?.session ?? null
  const isOnboarded = hasCompletedOnboarding(onboardingStatus)
  const homeLink = session ? (isOnboarded ? '/profile' : '/onboard') : '/'
  const status = healthCheck.isLoading
    ? 'loading'
    : healthCheck.isError
      ? 'disconnected'
      : healthCheck.data
        ? 'connected'
        : 'disconnected'

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
