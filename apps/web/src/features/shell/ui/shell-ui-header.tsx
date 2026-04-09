import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

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
    <header
      className="border-b border-white/6 bg-black/30 shadow-[0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-2xl supports-[backdrop-filter]:bg-black/10"
      style={shellUiHeaderStyle}
    >
      <div className="flex min-h-16 w-full flex-wrap items-center justify-between gap-3 px-4 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-6">
          <Link
            aria-label="TokenGator home"
            className="group min-w-0 transition-opacity hover:opacity-90"
            to={homeLink}
          >
            <img alt="TokenGator" className="hidden h-6 w-auto sm:h-7 dark:block" src="/brand/logo-white.svg" />
            <img alt="TokenGator" className="h-6 w-auto sm:h-7 dark:hidden" src="/brand/logo-black.svg" />
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">{actions}</div>
      </div>
    </header>
  )
}
