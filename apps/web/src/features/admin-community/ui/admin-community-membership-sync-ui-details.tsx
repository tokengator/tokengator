import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

import type { AdminCommunityMembershipSyncResult } from '../data-access/use-admin-community-membership-sync-apply'

interface AdminCommunityMembershipSyncUiDetailsProps {
  result: AdminCommunityMembershipSyncResult
}

export function AdminCommunityMembershipSyncUiDetails(props: AdminCommunityMembershipSyncUiDetailsProps) {
  const { result } = props

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview Details</CardTitle>
        <CardDescription>Inspect who will gain or lose organization membership and gated roles.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!result.users.length ? (
          <p className="text-muted-foreground text-sm">No current or pending gated members.</p>
        ) : null}
        {result.users.map((currentUser) => (
          <div className="grid gap-2 rounded-lg border p-3 text-sm" key={currentUser.userId}>
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-medium">{currentUser.name}</div>
                <div className="text-muted-foreground">
                  {currentUser.username ? `@${currentUser.username}` : 'No username'} ·{' '}
                  {currentUser.wallets.length ? currentUser.wallets.join(', ') : 'No linked wallets'}
                </div>
              </div>
              <div className="text-muted-foreground">
                Org role: {currentUser.currentOrganizationRole ?? 'none'}
                {currentUser.managedMembership ? ' · managed' : ''}
              </div>
            </div>
            <div>
              Current gated roles:{' '}
              {currentUser.currentGatedRoles.length
                ? currentUser.currentGatedRoles.map((role) => role.name).join(', ')
                : 'none'}
            </div>
            <div>
              Next gated roles:{' '}
              {currentUser.nextGatedRoles.length
                ? currentUser.nextGatedRoles.map((role) => role.name).join(', ')
                : 'none'}
            </div>
            <div>
              Team diff: +
              {currentUser.addToTeams.length ? currentUser.addToTeams.map((role) => role.name).join(', ') : 'none'} / -
              {currentUser.removeFromTeams.length
                ? currentUser.removeFromTeams.map((role) => role.name).join(', ')
                : 'none'}
            </div>
            <div>
              Organization diff: {currentUser.addToOrganization ? 'add' : 'keep'}
              {currentUser.removeFromOrganization ? ' / remove' : ''}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
