import type { AppSessionUser } from '@/features/auth/data-access/get-app-auth-state'

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

import { ShellUiDebugButton } from '@/features/shell/ui/shell-ui-debug-button'

export function ProfileUiAccountCard({ user }: { user: AppSessionUser }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your account details for TokenGator.</CardDescription>
        <CardAction>
          <ShellUiDebugButton data={user} label="Profile debug data" />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Name</p>
          <p className="font-medium">{user.name}</p>
        </div>
        {user.username ? (
          <div>
            <p className="text-muted-foreground">Username</p>
            <p className="font-medium">@{user.username}</p>
          </div>
        ) : null}
        <div>
          <p className="text-muted-foreground">Role</p>
          <p className="font-medium capitalize">{user.role ?? 'user'}</p>
        </div>
      </CardContent>
    </Card>
  )
}
