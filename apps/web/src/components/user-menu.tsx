import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@tokengator/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@tokengator/ui/components/dropdown-menu'
import { Skeleton } from '@tokengator/ui/components/skeleton'

import { authClient } from '@/features/auth/data-access/auth-client'
import { refreshAppAuthState } from '@/features/auth/data-access/get-app-auth-state'
import { useAppSession } from '@/features/auth/data-access/use-app-session'

export function UserMenu() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: session, isPending } = useAppSession()

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
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>{session.user.name}</DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col">
            <span>{session.user.name}</span>
            {session.user.username ? (
              <span className="text-muted-foreground text-xs font-normal">@{session.user.username}</span>
            ) : null}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {session.user.role === 'admin' ? (
            <DropdownMenuItem onClick={() => void navigate({ to: '/admin' })}>Admin</DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={() => void navigate({ to: '/profile' })}>Profile</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: async () => {
                    await refreshAppAuthState(queryClient)
                    void navigate({ to: '/' })
                  },
                },
              })
            }}
            variant="destructive"
          >
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
