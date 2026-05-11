import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

const shellUiHeaderStyle = {
  paddingLeft: 'env(safe-area-inset-left)',
  paddingRight: 'env(safe-area-inset-right)',
} as const

interface ShellUiHeaderProps {
  actions: ReactNode
  homeLink: '/' | '/onboard' | '/profile'
}

export function ShellUiHeader({ actions, homeLink }: ShellUiHeaderProps) {
  return (
    <header className="bg-background border-border border-b" style={shellUiHeaderStyle}>
      <div className="flex min-h-16 w-full flex-wrap items-center justify-between gap-3 px-4 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-6">
          <Link
            aria-label="TokenGator home"
            className="group min-w-0 transition-opacity hover:opacity-90"
            to={homeLink}
          >
            <img
              alt="TokenGator"
              className="hidden h-6 w-auto sm:h-7 dark:block"
              height={83}
              src="/brand/logo-white.svg"
              width={534}
            />
            <img
              alt="TokenGator"
              className="h-6 w-auto sm:h-7 dark:hidden"
              height={83}
              src="/brand/logo-black.svg"
              width={534}
            />
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">{actions}</div>
      </div>
    </header>
  )
}
