import { useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

import type { AdminCommunityGetResult } from '../data-access/use-admin-community-get-query'
import { useAdminCommunityDelete } from '../data-access/use-admin-community-delete'
import { AdminCommunitySettingsUiDeleteDialog } from '../ui/admin-community-settings-ui-delete-dialog'

interface AdminCommunityFeatureSettingsDeleteProps {
  organization: AdminCommunityGetResult
}

export function AdminCommunityFeatureSettingsDelete(props: AdminCommunityFeatureSettingsDeleteProps) {
  const { organization } = props
  const deleteCommunity = useAdminCommunityDelete()
  const navigate = useNavigate()

  async function handleDeleteCommunity() {
    try {
      await deleteCommunity.mutateAsync({
        organizationId: organization.id,
      })
      void navigate({ to: '/admin/communities' })

      return true
    } catch {
      return false
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Danger Zone</CardTitle>
        <CardDescription>Delete the community and all of its memberships.</CardDescription>
      </CardHeader>
      <CardContent>
        <AdminCommunitySettingsUiDeleteDialog isPending={deleteCommunity.isPending} onConfirm={handleDeleteCommunity} />
      </CardContent>
    </Card>
  )
}
