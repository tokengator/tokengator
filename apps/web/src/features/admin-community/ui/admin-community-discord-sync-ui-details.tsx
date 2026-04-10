import type {
  AdminCommunityRoleApplyDiscordRoleSyncResult,
  AdminCommunityRolePreviewDiscordRoleSyncResult,
} from '@tokengator/sdk'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { UiStatus, type UiStatusVariants } from '@tokengator/ui/components/ui-status'

import { formatAdminCommunityDiscordCheck } from '../util/admin-community-discord-check'

type AdminCommunityDiscordSyncResult =
  | AdminCommunityRoleApplyDiscordRoleSyncResult
  | AdminCommunityRolePreviewDiscordRoleSyncResult
type AdminCommunityDiscordOutcomeStatus = Extract<
  AdminCommunityDiscordSyncResult,
  { users: unknown[] }
>['users'][number]['outcomes'][number]['status']

function getDiscordOutcomeStatusTone(status: AdminCommunityDiscordOutcomeStatus): UiStatusVariants['tone'] {
  if (status === 'already_correct') {
    return 'neutral'
  }

  if (status === 'will_grant') {
    return 'success'
  }

  if (status === 'will_revoke') {
    return 'notice'
  }

  if (status === 'discord_api_failure') {
    return 'destructive'
  }

  return 'warning'
}

interface AdminCommunityDiscordSyncUiDetailsProps {
  result: AdminCommunityDiscordSyncResult
}

export function AdminCommunityDiscordSyncUiDetails(props: AdminCommunityDiscordSyncUiDetailsProps) {
  const { result } = props

  if (!result) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discord Reconcile Details</CardTitle>
        <CardDescription>
          Inspect linked-account status, guild membership, and per-role Discord outcomes.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!result.users.length ? (
          <p className="text-muted-foreground text-sm">
            No linked users or mapped Discord roles need review right now.
          </p>
        ) : null}
        {result.users.map((currentUser) => (
          <div className="grid gap-3 rounded-lg border p-3 text-sm" key={currentUser.userId}>
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-medium">{currentUser.name}</div>
                <div className="text-muted-foreground">
                  {currentUser.username ? `@${currentUser.username}` : 'No username'} ·{' '}
                  {currentUser.wallets.length ? currentUser.wallets.join(', ') : 'No linked wallets'}
                </div>
              </div>
              <div className="text-muted-foreground">
                Discord: {currentUser.discordAccountId ?? 'not linked'} · Guild:{' '}
                {currentUser.guildMemberPresent === null
                  ? 'unknown'
                  : currentUser.guildMemberPresent
                    ? 'present'
                    : 'absent'}
              </div>
            </div>
            <div className="grid gap-2">
              {currentUser.outcomes.map((outcome) => (
                <div
                  className="grid gap-2 rounded-lg border p-3"
                  key={`${currentUser.userId}-${outcome.communityRoleId}`}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-medium">{outcome.communityRoleName}</div>
                      <div className="text-muted-foreground">
                        Discord role: {outcome.discordRoleName ?? outcome.discordRoleId ?? 'not mapped'}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <UiStatus tone={getDiscordOutcomeStatusTone(outcome.status)}>
                        {formatAdminCommunityDiscordCheck(outcome.status)}
                      </UiStatus>
                      {'execution' in outcome ? <UiStatus casing="uppercase">{outcome.execution}</UiStatus> : null}
                    </div>
                  </div>
                  <div className="text-muted-foreground">
                    Desired: {outcome.desired ? 'yes' : 'no'} · Current:{' '}
                    {outcome.current === null ? 'unknown' : outcome.current ? 'yes' : 'no'}
                    {'attemptedAction' in outcome && outcome.attemptedAction
                      ? ` · Action: ${outcome.attemptedAction}`
                      : ''}
                  </div>
                  {'errorMessage' in outcome && outcome.errorMessage ? (
                    <div className="text-destructive text-xs">{outcome.errorMessage}</div>
                  ) : null}
                  {outcome.checks.length ? (
                    <ol className="list-decimal space-y-1 pl-5 text-xs">
                      {outcome.checks.map((check) => (
                        <li key={`${currentUser.userId}-${outcome.communityRoleId}-${check}`}>
                          {formatAdminCommunityDiscordCheck(check)}
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
