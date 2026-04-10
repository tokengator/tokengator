import type { AdminOrganizationDetailEntity } from '@tokengator/sdk'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

import { useAdminCommunityUpdate } from '../data-access/use-admin-community-update'
import {
  AdminCommunitySettingsUiForm,
  type AdminCommunitySettingsUiFormValues,
} from '../ui/admin-community-settings-ui-form'

interface AdminCommunityFeatureSettingsProps {
  organization: AdminOrganizationDetailEntity
}

export function AdminCommunityFeatureSettings(props: AdminCommunityFeatureSettingsProps) {
  const { organization } = props
  const updateCommunity = useAdminCommunityUpdate()

  async function handleSaveCommunity(values: AdminCommunitySettingsUiFormValues) {
    try {
      await updateCommunity.mutateAsync({
        data: {
          logo: values.logo || undefined,
          name: values.name,
          slug: values.slug,
        },
        organizationId: organization.id,
      })

      return true
    } catch {
      return false
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Community Details</CardTitle>
        <CardDescription>Edit the core community fields.</CardDescription>
      </CardHeader>
      <CardContent>
        <AdminCommunitySettingsUiForm
          initialValues={{
            logo: organization.logo ?? '',
            name: organization.name,
            slug: organization.slug,
          }}
          isPending={updateCommunity.isPending}
          onSubmit={handleSaveCommunity}
        />
      </CardContent>
    </Card>
  )
}
