import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { UiListCard, UiListCardHeader, UiListCardMeta } from '@tokengator/ui/components/ui-list-card'
import { UiTextCopyIcon } from '@tokengator/ui/components/ui-text-copy-icon'

type ProfileIdentity = {
  avatarUrl: string | null
  displayName: string | null
  email: string | null
  id: string
  isPrimary: boolean
  linkedAt: number
  provider: string
  providerId: string | null
  username: string | null
}

interface ProfileUiIdentitiesCardProps {
  description?: string
  identities: ProfileIdentity[]
  isPending?: boolean
}

function formatConnectedDate(linkedAt: number) {
  return new Date(linkedAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatProviderLabel(provider: string) {
  switch (provider) {
    case 'discord':
      return 'Discord'
    case 'solana':
      return 'Solana'
    default:
      return provider
  }
}

function getIdentityLabel(identity: ProfileIdentity) {
  return (
    identity.displayName ??
    identity.username ??
    identity.email ??
    identity.providerId ??
    formatProviderLabel(identity.provider)
  )
}

export function ProfileUiIdentitiesCard({
  description = 'Linked identities for your TokenGator account.',
  identities,
  isPending = false,
}: ProfileUiIdentitiesCardProps) {
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
          ? identities.map((identity) => (
              <UiListCard key={identity.id}>
                <UiListCardHeader>
                  <p className="font-medium">{formatProviderLabel(identity.provider)}</p>
                  <UiListCardMeta>
                    Connected {formatConnectedDate(identity.linkedAt)}
                    {identity.isPrimary ? ' · Primary' : ''}
                  </UiListCardMeta>
                </UiListCardHeader>
                <p className="font-medium">{getIdentityLabel(identity)}</p>
                {identity.email && identity.email !== getIdentityLabel(identity) ? (
                  <p className="text-muted-foreground text-xs">{identity.email}</p>
                ) : null}
                {identity.username && identity.username !== getIdentityLabel(identity) ? (
                  <p className="text-muted-foreground text-xs">@{identity.username}</p>
                ) : null}
                {identity.providerId ? (
                  <div className="flex items-center gap-1.5">
                    <p className="font-mono text-xs">{identity.providerId}</p>
                    <UiTextCopyIcon text={identity.providerId} title="Copy identity ID" toast="Identity ID copied." />
                  </div>
                ) : null}
              </UiListCard>
            ))
          : null}
      </CardContent>
    </Card>
  )
}
