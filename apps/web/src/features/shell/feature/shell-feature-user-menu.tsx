import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

import { authClient } from '@/features/auth/data-access/auth-client'
import { refreshAppAuthState } from '@/features/auth/data-access/get-app-auth-state'
import { useAppSession } from '@/features/auth/data-access/use-app-session'

import { ShellUiUserMenu } from '../ui/shell-ui-user-menu'

export function ShellFeatureUserMenu() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: session, isPending } = useAppSession()

  return (
    <ShellUiUserMenu
      isPending={isPending}
      onAdminClick={() => void navigate({ to: '/admin' })}
      onProfileClick={() => void navigate({ to: '/profile' })}
      onSignOut={() => {
        authClient.signOut({
          fetchOptions: {
            onError: (error) => {
              toast.error(error instanceof Error ? error.message : 'Unable to sign out')
            },
            onSuccess: async () => {
              await refreshAppAuthState(queryClient)
              void navigate({ to: '/' })
            },
          },
        })
      }}
      session={session}
    />
  )
}
