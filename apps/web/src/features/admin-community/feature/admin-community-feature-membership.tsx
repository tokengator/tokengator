import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

import { type AdminCommunityGetResult, useAdminCommunityGetQuery } from '../data-access/use-admin-community-get-query'
import { useAdminCommunityMemberRemove } from '../data-access/use-admin-community-member-remove'
import { useAdminCommunityMemberRoleUpdate } from '../data-access/use-admin-community-member-role-update'
import {
  AdminCommunityMembershipUiList,
  type AdminCommunityMembershipRole,
} from '../ui/admin-community-membership-ui-list'

interface AdminCommunityFeatureMembershipProps {
  initialOrganization: AdminCommunityGetResult
}

export function AdminCommunityFeatureMembership(props: AdminCommunityFeatureMembershipProps) {
  const { initialOrganization } = props
  const removeMember = useAdminCommunityMemberRemove(initialOrganization.id)
  const updateMemberRole = useAdminCommunityMemberRoleUpdate(initialOrganization.id)
  const { data } = useAdminCommunityGetQuery(initialOrganization.id, {
    initialData: initialOrganization,
  })

  async function handleMemberRemove(memberId: string) {
    try {
      await removeMember.mutateAsync({
        memberId,
      })

      return true
    } catch {
      return false
    }
  }

  async function handleMemberRoleUpdate(memberId: string, role: AdminCommunityMembershipRole) {
    try {
      await updateMemberRole.mutateAsync({
        memberId,
        role,
      })
    } catch {}
  }

  if (!data) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>Update roles or remove members from the community.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <AdminCommunityMembershipUiList
          isRemovePending={removeMember.isPending}
          isUpdatePending={updateMemberRole.isPending}
          members={data.members}
          onMemberRemove={handleMemberRemove}
          onMemberRoleUpdate={handleMemberRoleUpdate}
        />
      </CardContent>
    </Card>
  )
}
