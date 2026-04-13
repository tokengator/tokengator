import type { ProfileIdentityEntity } from '@tokengator/sdk'
import { formatProviderLabel } from '@/features/profile/ui/format-provider-label.tsx'
import { getIdentityProviderGroups } from '@/features/profile/ui/get-identity-provider-groups.tsx'
import { ProfileUiIdentityProviderIcon } from '@/features/profile/ui/profile-ui-identity-provider-icon.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { UiDebugDialog } from '@tokengator/ui/components/ui-debug-dialog.tsx'
import { UiListCard, UiListCardHeader, UiListCardMeta } from '@tokengator/ui/components/ui-list-card'
import { UiTextCopyIcon } from '@tokengator/ui/components/ui-text-copy-icon'

interface ProfileUiIdentitiesCardProps {
  description?: string
  identities: ProfileIdentityEntity[]
  isPending?: boolean
}

function formatConnectedDate(linkedAt: number) {
  return new Date(linkedAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function ProfileUiAdminIdentityRow({ identity }: { identity: ProfileIdentityEntity }) {
  return (
    <UiListCard key={identity.id}>
      <UiListCardHeader>
        <p className="font-medium">{identity.label}</p>
        <UiListCardMeta>
          Connected {formatConnectedDate(identity.linkedAt)}
          {identity.isPrimary ? ' · Primary' : ''}
          <UiDebugDialog data={identity} />
        </UiListCardMeta>
      </UiListCardHeader>
      {identity.email && identity.email !== identity.label ? (
        <p className="text-muted-foreground text-xs">{identity.email}</p>
      ) : null}
      {identity.username && identity.username !== identity.label ? (
        <p className="text-muted-foreground text-xs">@{identity.username}</p>
      ) : null}
      {identity.providerId ? (
        <div className="flex items-center gap-1.5">
          <p className="font-mono text-xs">{identity.providerId}</p>
          <UiTextCopyIcon text={identity.providerId} title="Copy provider ID" toast="Provider ID copied." />
        </div>
      ) : null}
    </UiListCard>
  )
}

export function ProfileUiAdminIdentitiesCard({
  description = 'Linked identities for your TokenGator account.',
  identities,
  isPending = false,
}: ProfileUiIdentitiesCardProps) {
  const identityProviderGroups = getIdentityProviderGroups(identities)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Identities</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {isPending ? <p className="text-muted-foreground">Loading identities...</p> : null}
        {!isPending && identities.length === 0 ? (
          <p className="text-muted-foreground">No linked identities yet.</p>
        ) : null}
        {!isPending
          ? identityProviderGroups.map(({ identities, provider }) => (
              <div className="grid gap-3 rounded-lg border p-3" key={provider}>
                <div className="flex items-center gap-2">
                  <ProfileUiIdentityProviderIcon provider={provider} />
                  <p className="font-medium">{formatProviderLabel(provider)}</p>
                </div>
                <div className="grid gap-3">
                  {identities.length ? (
                    identities.map((identity) => <ProfileUiAdminIdentityRow identity={identity} key={identity.id} />)
                  ) : (
                    <p className="text-muted-foreground">No linked {provider} identities yet.</p>
                  )}
                </div>
              </div>
            ))
          : null}
      </CardContent>
    </Card>
  )
}
