import { Link } from '@tanstack/react-router'

import type { OrganizationListMineData } from '@/features/organization/data-access/get-organization-list-mine'
import type { OnboardingStatus } from '@/features/organization/feature/organization-feature-active-access'
import { hasCompletedOnboarding } from '@/features/organization/feature/organization-feature-active-access'
import { OrganizationFeatureSelectActive } from '@/features/organization/feature/organization-feature-select-active'

import ApiStatusIndicator from './api-status-indicator'
import ThemeToggle from './theme-toggle'
import UserMenu from './user-menu'

interface HeaderProps {
  initialOrganizations: OrganizationListMineData | null
  onboardingStatus: OnboardingStatus | null
  session: {
    session?: {
      activeOrganizationId?: string | null
    } | null
    user: {
      role?: string | null
      username?: string | null
    }
  } | null
}

export default function Header({ initialOrganizations, onboardingStatus, session }: HeaderProps) {
  const isOnboarded = hasCompletedOnboarding(onboardingStatus)
  const homeLink = session ? (isOnboarded ? '/profile' : '/onboard') : '/'
  const links = session
    ? [
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Todos', to: '/todos' },
      ]
    : []

  return (
    <header className="border-b">
      <div className="flex min-h-14 w-full flex-wrap items-center justify-between gap-3 px-4 py-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4 md:gap-6">
          <Link className="hover:text-primary text-sm font-semibold tracking-[0.24em] transition-colors" to={homeLink}>
            TokenGator
          </Link>
          {session && isOnboarded ? (
            <>
              <OrganizationFeatureSelectActive initialData={initialOrganizations} />
              <nav aria-label="Primary" className="flex flex-wrap items-center gap-4 text-sm">
                {links.map(({ label, to }) => {
                  return (
                    <Link
                      activeOptions={{
                        exact: false,
                        includeSearch: false,
                      }}
                      activeProps={{
                        className: 'text-foreground',
                      }}
                      className="transition-colors"
                      inactiveProps={{
                        className: 'text-muted-foreground hover:text-foreground',
                      }}
                      key={to}
                      to={to}
                    >
                      {label}
                    </Link>
                  )
                })}
              </nav>
            </>
          ) : null}
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
