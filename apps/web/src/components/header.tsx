import { Link } from '@tanstack/react-router'

import type { OnboardingStatus } from '@/features/organization/feature/organization-feature-active-access'
import { useAppAuthStateQuery } from '@/features/auth/data-access/use-app-auth-state-query'
import { hasCompletedOnboarding } from '@/features/organization/feature/organization-feature-active-access'

import { ApiStatusIndicator } from './api-status-indicator'
import { ThemeToggle } from './theme-toggle'
import { UserMenu } from './user-menu'

export function Header() {
  const { data } = useAppAuthStateQuery()
  const onboardingStatus: OnboardingStatus | null = data?.onboardingStatus ?? null
  const session = data?.session ?? null
  const isOnboarded = hasCompletedOnboarding(onboardingStatus)
  const homeLink = session ? (isOnboarded ? '/profile' : '/onboard') : '/'

  return (
    <header className="border-b">
      <div className="flex min-h-14 w-full flex-wrap items-center justify-between gap-3 px-4 py-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4 md:gap-6">
          <Link className="hover:text-primary text-sm font-semibold tracking-[0.24em] transition-colors" to={homeLink}>
            TokenGator
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <ApiStatusIndicator />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
