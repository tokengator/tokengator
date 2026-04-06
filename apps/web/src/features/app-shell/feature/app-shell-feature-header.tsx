import type { OnboardingStatus } from '@/features/organization/feature/organization-feature-active-access'
import { useAppAuthStateQuery } from '@/features/auth/data-access/use-app-auth-state-query'
import { hasCompletedOnboarding } from '@/features/organization/feature/organization-feature-active-access'

import { useAppShellHealthCheckQuery } from '../data-access/use-app-shell-health-check-query'
import { AppShellUiHeader } from '../ui/app-shell-ui-header'
import { AppShellUiStatusIndicator } from '../ui/app-shell-ui-status-indicator'
import { AppShellUiThemeToggle } from '../ui/app-shell-ui-theme-toggle'

import { AppShellFeatureUserMenu } from './app-shell-feature-user-menu'

export function AppShellFeatureHeader() {
  const { data } = useAppAuthStateQuery()
  const healthCheck = useAppShellHealthCheckQuery()
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
    <AppShellUiHeader
      actions={
        <>
          <AppShellUiStatusIndicator status={status} />
          <AppShellUiThemeToggle />
          <AppShellFeatureUserMenu />
        </>
      }
      homeLink={homeLink}
    />
  )
}
