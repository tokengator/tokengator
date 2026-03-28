import type { OrganizationListMineData } from '@/features/organization/data-access/get-organization-list-mine'
import { useOrganizationListMine } from '@/features/organization/data-access/use-organization-list-mine'

import { useProfileListIdentities } from '../data-access/use-profile-list-identities'
import { useProfileListSolanaWallets } from '../data-access/use-profile-list-solana-wallets'
import { ProfileUiAccountCard } from '../ui/profile-ui-account-card'
import { ProfileUiCommunitiesCard } from '../ui/profile-ui-communities-card'
import { ProfileUiIdentitiesCard } from '../ui/profile-ui-identities-card'
import { ProfileUiSolanaCard } from '../ui/profile-ui-solana-card'

interface ProfileFeatureIndexProps {
  initialOrganizationListMine: OrganizationListMineData
  session: {
    user: {
      email: string
      id: string
      name: string
      role?: string | null
      username?: string | null
    }
  }
}

export function ProfileFeatureIndex({ initialOrganizationListMine, session }: ProfileFeatureIndexProps) {
  const communities = useOrganizationListMine(session.user.id, {
    initialData: initialOrganizationListMine,
  })
  const identities = useProfileListIdentities(session.user.id)
  const solanaWallets = useProfileListSolanaWallets(session.user.id)

  return (
    <div className="min-h-full overflow-y-auto px-4 py-6">
      <div className="mx-auto grid w-full max-w-xl gap-6">
        <ProfileUiAccountCard
          email={session.user.email}
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
          onLinked={async () => {
            await Promise.all([identities.refetch(), solanaWallets.refetch()])
          }}
          solanaWallets={solanaWallets.data?.solanaWallets ?? []}
        />
        <ProfileUiIdentitiesCard identities={identities.data?.identities ?? []} isPending={identities.isPending} />
      </div>
    </div>
  )
}
