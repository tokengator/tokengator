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

import type { AppSession } from '@/features/auth/data-access/get-app-auth-state'

interface AppShellUiSignedInUserMenuProps {
  onAdminClick: () => void
  onProfileClick: () => void
  onSignOut: () => void
  session: AppSession
}

export function AppShellUiSignedInUserMenu({
  onAdminClick,
  onProfileClick,
  onSignOut,
  session,
}: AppShellUiSignedInUserMenuProps) {
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
          {session.user.role === 'admin' ? <DropdownMenuItem onClick={onAdminClick}>Admin</DropdownMenuItem> : null}
          <DropdownMenuItem onClick={onProfileClick}>Profile</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onSignOut} variant="destructive">
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
