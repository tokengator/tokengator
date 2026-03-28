import { useProfileListIdentities } from '../data-access/use-profile-list-identities'
import { useProfileListSolanaWallets } from '../data-access/use-profile-list-solana-wallets'
import { ProfileUiAccountCard } from '../ui/profile-ui-account-card'
import { ProfileUiIdentitiesCard } from '../ui/profile-ui-identities-card'
import { ProfileUiSolanaCard } from '../ui/profile-ui-solana-card'

interface ProfileFeatureIndexProps {
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

export function ProfileFeatureIndex({ session }: ProfileFeatureIndexProps) {
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
