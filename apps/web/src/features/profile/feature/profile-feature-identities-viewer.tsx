import type { ProfileListIdentitiesByUsernameResult } from '@tokengator/sdk'
import { useProfileIdentitiesByUsernameQuery } from '@/features/profile/data-access/use-profile-identities-by-username-query.tsx'
import { getIdentityProviderGroups } from '@/features/profile/ui/get-identity-provider-groups.tsx'
import { ProfileUiUserIdentityCard } from '@/features/profile/ui/profile-ui-user-identity-card.tsx'

export function ProfileFeatureIdentitiesViewer({
  initialIdentities,
  username,
}: {
  initialIdentities: ProfileListIdentitiesByUsernameResult | null
  username: string
}) {
  const identities = useProfileIdentitiesByUsernameQuery(username, {
    initialData: initialIdentities,
  })

  if (identities.error) {
    return <div className="text-destructive text-sm">{identities.error.message}</div>
  }

  if (!identities.isPending && !identities.data) {
    return null
  }

  const identityProviderGroups = getIdentityProviderGroups(identities.data?.identities ?? [])

  return (
    <div className="grid gap-6">
      {identityProviderGroups.map((identityProviderGroup) => (
        <ProfileUiUserIdentityCard
          identities={identityProviderGroup.identities}
          isPending={identities.isPending}
          key={identityProviderGroup.provider}
          provider={identityProviderGroup.provider}
        />
      ))}
    </div>
  )
}
