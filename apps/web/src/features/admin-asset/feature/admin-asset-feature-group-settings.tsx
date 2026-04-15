import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@tokengator/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

import { useAdminAssetGroupDelete } from '../data-access/use-admin-asset-group-delete'
import { useAdminAssetGroupGetQuery } from '../data-access/use-admin-asset-group-get-query'
import { useAdminAssetGroupUpdate } from '../data-access/use-admin-asset-group-update'
import { AdminAssetGroupUiDeleteDialog } from '../ui/admin-asset-group-ui-delete-dialog'
import { AdminAssetGroupUiForm } from '../ui/admin-asset-group-ui-form'

interface AdminAssetFeatureGroupSettingsProps {
  assetGroupId: string
}

export function AdminAssetFeatureGroupSettings(props: AdminAssetFeatureGroupSettingsProps) {
  const { assetGroupId } = props
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const assetGroup = useAdminAssetGroupGetQuery(assetGroupId)
  const deleteAssetGroup = useAdminAssetGroupDelete()
  const navigate = useNavigate()
  const updateAssetGroup = useAdminAssetGroupUpdate()

  if (!assetGroup.data) {
    return null
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Asset Group Details</CardTitle>
          <CardDescription>Edit the group metadata the indexer will use.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminAssetGroupUiForm
            initialValues={{
              address: assetGroup.data.address,
              decimals: assetGroup.data.decimals,
              enabled: assetGroup.data.enabled,
              imageUrl: assetGroup.data.imageUrl,
              label: assetGroup.data.label,
              type: assetGroup.data.type,
            }}
            isPending={updateAssetGroup.isPending}
            onSubmit={async (values) => {
              await updateAssetGroup.mutateAsync({
                assetGroupId,
                data: values,
              })
            }}
            submitLabel="Save Changes"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>Delete this asset group and all indexed assets stored beneath it.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsDeleteDialogOpen(true)} type="button" variant="destructive">
            Delete Asset Group
          </Button>
          <AdminAssetGroupUiDeleteDialog
            assetGroupLabel={assetGroup.data.label}
            isPending={deleteAssetGroup.isPending}
            onConfirm={async () => {
              await deleteAssetGroup.mutateAsync({
                assetGroupId,
              })
              setIsDeleteDialogOpen(false)
              void navigate({
                search: {
                  limit: 25,
                  offset: 0,
                },
                to: '/admin/assets',
              })
            }}
            onOpenChange={setIsDeleteDialogOpen}
            open={isDeleteDialogOpen}
          />
        </CardContent>
      </Card>
    </div>
  )
}
