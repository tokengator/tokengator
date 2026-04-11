import { Loader2 } from 'lucide-react'
import type { AdminUserDetailEntity } from '@tokengator/sdk'

import { useAdminUserCommunitiesQuery } from '../data-access/use-admin-user-communities-query'
import { useAdminUserCommunityMembershipRemove } from '../data-access/use-admin-user-community-membership-remove'
import { useAdminUserCommunityMembershipUpdate } from '../data-access/use-admin-user-community-membership-update'
import { AdminUserCommunitiesUiList } from '../ui/admin-user-communities-ui-list'

export function AdminUserFeatureCommunities({ initialUser }: { initialUser: AdminUserDetailEntity }) {
  const removeMembership = useAdminUserCommunityMembershipRemove(initialUser.id)
  const updateMembership = useAdminUserCommunityMembershipUpdate(initialUser.id)
  const communities = useAdminUserCommunitiesQuery(initialUser.id)

  async function handleMembershipRemove(memberId: string) {
    try {
      await removeMembership.mutateAsync({
        memberId,
        userId: initialUser.id,
      })
    } catch {
      // Error feedback is handled by the mutation onError callback.
    }
  }

  async function handleMembershipRoleChange(memberId: string, role: 'admin' | 'member' | 'owner') {
    try {
      await updateMembership.mutateAsync({
        memberId,
        role,
        userId: initialUser.id,
      })
    } catch {
      // Error feedback is handled by the mutation onError callback.
    }
  }

  if (communities.error) {
    return <div className="text-destructive text-sm">{communities.error.message}</div>
  }

  if (communities.isPending) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading communities
      </div>
    )
  }

  return (
    <AdminUserCommunitiesUiList
      communities={communities.data?.communities ?? []}
      isRemovePending={removeMembership.isPending}
      isUpdatePending={updateMembership.isPending}
      onRemove={handleMembershipRemove}
      onRoleChange={handleMembershipRoleChange}
    />
  )
}
