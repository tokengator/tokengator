import type { OrganizationListMineData } from '@/features/organization/data-access/get-organization-list-mine'
import { useOrganizationListMine } from '@/features/organization/data-access/use-organization-list-mine'

import { useAppSession } from '@/features/auth/data-access/use-app-session'
import { ProfileUiCommunitiesCard } from '../ui/profile-ui-communities-card'

export function ProfileFeatureAssets({
  initialOrganizationListMine,
}: {
  initialOrganizationListMine: OrganizationListMineData
}) {
  const { data: session } = useAppSession()
  const communities = useOrganizationListMine(session?.user.id ?? '', {
    initialData: initialOrganizationListMine,
  })

  if (!session) {
    return null
  }

  return (
    <div className="grid gap-6">
      <ProfileUiCommunitiesCard communities={communities.data?.organizations ?? []} isPending={communities.isPending} />
    </div>
  )
}
