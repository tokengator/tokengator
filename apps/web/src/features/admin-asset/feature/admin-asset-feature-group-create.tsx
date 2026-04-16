import { useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

import { useAdminAssetGroupCreate } from '../data-access/use-admin-asset-group-create'
import { useAdminAssetGroupLookup } from '../data-access/use-admin-asset-group-lookup'
import { useAdminAssetGroupUpdate } from '../data-access/use-admin-asset-group-update'
import { AdminAssetGroupUiCreateAddressForm } from '../ui/admin-asset-group-ui-create-address-form'
import { AdminAssetGroupUiCreatePreview } from '../ui/admin-asset-group-ui-create-preview'
import { ellipsifyAddress } from '../util/ellipsify-address'

export function AdminAssetFeatureGroupCreate() {
  const createAssetGroup = useAdminAssetGroupCreate()
  const lookupAssetGroup = useAdminAssetGroupLookup()
  const navigate = useNavigate()
  const updateAssetGroup = useAdminAssetGroupUpdate()

  function getLookupCreateValues() {
    const suggestion = lookupAssetGroup.data?.suggestion

    if (!suggestion?.resolvable || !suggestion.address || !suggestion.type) {
      return null
    }

    const values = {
      address: suggestion.address,
      decimals: suggestion.decimals,
      enabled: true,
      imageUrl: suggestion.imageUrl,
      label: suggestion.label?.trim() || ellipsifyAddress(suggestion.address),
      symbol: suggestion.symbol,
      type: suggestion.type,
    }

    return values
  }

  async function handleCreateAssetGroup() {
    const values = getLookupCreateValues()

    if (!values || lookupAssetGroup.data?.existingAssetGroup) {
      return
    }

    const assetGroup = await createAssetGroup.mutateAsync(values).catch(() => null)

    if (!assetGroup) {
      return
    }

    navigateToAssetGroup(assetGroup.id)
  }

  async function handleUpdateExistingAssetGroup() {
    const existingAssetGroup = lookupAssetGroup.data?.existingAssetGroup
    const values = getLookupCreateValues()

    if (!existingAssetGroup || !values) {
      return
    }

    const assetGroup = await updateAssetGroup
      .mutateAsync({
        assetGroupId: existingAssetGroup.id,
        data: {
          ...values,
          enabled: existingAssetGroup.enabled,
        },
      })
      .catch(() => null)

    if (!assetGroup) {
      return
    }

    navigateToAssetGroup(assetGroup.id)
  }

  function navigateToAssetGroup(assetGroupId: string) {
    void navigate({
      params: {
        assetGroupId,
      },
      to: '/admin/assets/$assetGroupId/settings',
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">Create Asset Group</h2>
        <p className="text-muted-foreground text-sm">Resolve a Solana address before creating an indexed group.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lookup Address</CardTitle>
          <CardDescription>Find the collection or mint target supported by the indexer.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminAssetGroupUiCreateAddressForm
            errorMessage={lookupAssetGroup.error?.message ?? null}
            isPending={lookupAssetGroup.isPending}
            lookupAssetGroup={(address) => {
              lookupAssetGroup.reset()
              lookupAssetGroup.mutate({ address })
            }}
          />
        </CardContent>
      </Card>
      {lookupAssetGroup.data ? (
        <AdminAssetGroupUiCreatePreview
          isCreating={createAssetGroup.isPending}
          isLookupPending={lookupAssetGroup.isPending}
          isUpdating={updateAssetGroup.isPending}
          lookup={lookupAssetGroup.data}
          onConfirm={() => void handleCreateAssetGroup()}
          onOpenExisting={(assetGroupId) => navigateToAssetGroup(assetGroupId)}
          onUpdateMetadata={() => void handleUpdateExistingAssetGroup()}
        />
      ) : null}
    </div>
  )
}
