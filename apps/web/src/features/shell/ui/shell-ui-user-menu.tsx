import { Link } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { Button } from '@tokengator/ui/components/button'
import { Skeleton } from '@tokengator/ui/components/skeleton'

import type { AppSession } from '@/features/auth/data-access/get-app-auth-state'

const ShellUiSignedInUserMenu = lazy(async () => ({
  default: (await import('./shell-ui-signed-in-user-menu')).ShellUiSignedInUserMenu,
}))

interface ShellUiUserMenuProps {
  isPending: boolean
  onAdminClick: () => void
  onDevelopmentClick: () => void
  onProfileClick: () => void
  onSignOut: () => void
  session: AppSession | null
}

export function ShellUiUserMenu({
  isPending,
  onAdminClick,
  onDevelopmentClick,
  onProfileClick,
  onSignOut,
  session,
}: ShellUiUserMenuProps) {
  if (isPending) {
    return <Skeleton className="h-8 w-24" />
  }

  if (!session) {
    return (
      <Button nativeButton={false} render={<Link to="/login" />} variant="outline">
        Login
      </Button>
    )
  }

  return (
    <Suspense
      fallback={
        <Button disabled variant="outline">
          {session.user.name}
        </Button>
      }
    >
      <ShellUiSignedInUserMenu
        onAdminClick={onAdminClick}
        onDevelopmentClick={onDevelopmentClick}
        onProfileClick={onProfileClick}
        onSignOut={onSignOut}
        session={session}
      />
    </Suspense>
  )
}
