import type { ReactNode } from 'react'
import type { IdentityProvider, ProfileIdentityEntity } from '@tokengator/sdk'
import { formatProviderLabel } from '@/features/profile/ui/format-provider-label.tsx'
import { ProfileUiIdentityProviderIcon } from '@/features/profile/ui/profile-ui-identity-provider-icon.tsx'
import { ShellUiDebugButton } from '@/features/shell/ui/shell-ui-debug-button.tsx'
import { Card, CardContent, CardHeader, CardTitle } from '@tokengator/ui/components/card.tsx'
import { UiListCard, UiListCardHeader, UiListCardMeta } from '@tokengator/ui/components/ui-list-card.tsx'
import { UiTextCopyIcon } from '@tokengator/ui/components/ui-text-copy-icon.tsx'

function ProfileUiUserIdentityRow({
  identity,
  renderRowActions,
}: {
  identity: ProfileIdentityEntity
  renderRowActions?: (identity: ProfileIdentityEntity) => ReactNode
}) {
  return (
    <UiListCard key={identity.id}>
      <UiListCardHeader>
        <div className="min-w-0">
          <p className="truncate font-medium">{identity.label}</p>
          {identity.email && identity.email !== identity.label ? (
            <p className="text-muted-foreground text-xs">{identity.email}</p>
          ) : null}
          {identity.username && identity.username !== identity.label ? (
            <p className="text-muted-foreground text-xs">@{identity.username}</p>
          ) : null}
        </div>
        <UiListCardMeta className="flex items-center gap-1">
          <ShellUiDebugButton data={identity} />
          {renderRowActions?.(identity)}
        </UiListCardMeta>
      </UiListCardHeader>

      <div className="flex items-center gap-1.5">
        <p className="font-mono text-xs">{identity.providerId}</p>
        <UiTextCopyIcon text={identity.providerId} title="Copy provider ID" toast="Provider ID copied." />
      </div>
    </UiListCard>
  )
}

export function ProfileUiUserIdentityCard({
  footer,
  identities,
  isPending = false,
  provider,
  renderRowActions,
}: {
  footer?: ReactNode
  identities: ProfileIdentityEntity[]
  isPending?: boolean
  provider: IdentityProvider
  renderRowActions?: (identity: ProfileIdentityEntity) => ReactNode
}) {
  const providerLabel = formatProviderLabel(provider)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ProfileUiIdentityProviderIcon provider={provider} />
          <span>{providerLabel}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {isPending ? <p className="text-muted-foreground">Loading {providerLabel} identities...</p> : null}
        {!isPending && identities.length === 0 ? (
          <p className="text-muted-foreground">No linked {providerLabel} identities yet.</p>
        ) : null}
        {!isPending
          ? identities.map((identity) => (
              <ProfileUiUserIdentityRow identity={identity} key={identity.id} renderRowActions={renderRowActions} />
            ))
          : null}
        {footer}
      </CardContent>
    </Card>
  )
}
