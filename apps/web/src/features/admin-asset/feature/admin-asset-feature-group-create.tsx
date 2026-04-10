import { useNavigate } from '@tanstack/react-router'
import type { AdminAssetGroupUpdateInput } from '@tokengator/sdk'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

import { useAdminAssetGroupCreate } from '../data-access/use-admin-asset-group-create'
import { AdminAssetGroupUiForm } from '../ui/admin-asset-group-ui-form'

const defaultFormValues = {
  address: '',
  enabled: true,
  label: '',
  type: 'collection',
} satisfies AdminAssetGroupUpdateInput['data']

export function AdminAssetFeatureGroupCreate() {
  const createAssetGroup = useAdminAssetGroupCreate()
  const navigate = useNavigate()

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">Create Asset Group</h2>
        <p className="text-muted-foreground text-sm">Add the group metadata the indexer will target later.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Group Details</CardTitle>
          <CardDescription>Define the type and address the indexer will target later.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminAssetGroupUiForm
            initialValues={defaultFormValues}
            isPending={createAssetGroup.isPending}
            onSubmit={async (values) => {
              const assetGroup = await createAssetGroup.mutateAsync(values)

              void navigate({
                params: {
                  assetGroupId: assetGroup.id,
                },
                to: '/admin/assets/$assetGroupId/settings',
              })
            }}
            showEnabled={false}
            submitLabel="Create Asset Group"
          />
        </CardContent>
      </Card>
    </div>
  )
}
