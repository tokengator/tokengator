import type { OrganizationListMineData } from '@/features/organization/data-access/get-organization-list-mine'
import { useAppSession } from '@/features/auth/data-access/use-app-auth-state'
import { useOrganizationListMine } from '@/features/organization/data-access/use-organization-list-mine'

import { useProfileListIdentities } from '../data-access/use-profile-list-identities'
import { useProfileListSolanaWallets } from '../data-access/use-profile-list-solana-wallets'
import { ProfileUiAccountCard } from '../ui/profile-ui-account-card'
import { ProfileUiCommunitiesCard } from '../ui/profile-ui-communities-card'
import { ProfileUiIdentitiesCard } from '../ui/profile-ui-identities-card'
import { ProfileUiSolanaCard } from '../ui/profile-ui-solana-card'

export function ProfileFeatureIndex({
  initialOrganizationListMine,
}: {
  initialOrganizationListMine: OrganizationListMineData
}) {
  const { data: session } = useAppSession()
  const communities = useOrganizationListMine(session?.user.id ?? '', {
    initialData: initialOrganizationListMine,
  })
  const identities = useProfileListIdentities(session?.user.id ?? '')
  const solanaWallets = useProfileListSolanaWallets(session?.user.id ?? '')

  if (!session) {
    return null
  }

  return (
    <div className="min-h-full overflow-y-auto px-4 py-6">
      <div className="mx-auto grid w-full max-w-xl gap-6">
        <ProfileUiAccountCard
          name={session.user.name}
          role={session.user.role ?? 'user'}
          username={session.user.username}
        />
        <ProfileUiCommunitiesCard
          communities={communities.data?.organizations ?? []}
          isPending={communities.isPending}
        />
        <ProfileUiSolanaCard
          isPending={solanaWallets.isPending}
          solanaWallets={solanaWallets.data?.solanaWallets ?? []}
        />
        <ProfileUiIdentitiesCard identities={identities.data?.identities ?? []} isPending={identities.isPending} />
      </div>
    </div>
  )
}
