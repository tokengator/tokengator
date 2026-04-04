import type { ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

import type { AdminCommunityGetResult } from '../data-access/use-admin-community-get-query'
import { useAdminCommunityDelete } from '../data-access/use-admin-community-delete'
import { useAdminCommunityUpdate } from '../data-access/use-admin-community-update'
import { AdminCommunitySettingsUiDeleteDialog } from '../ui/admin-community-settings-ui-delete-dialog'
import {
  AdminCommunitySettingsUiForm,
  type AdminCommunitySettingsUiFormValues,
} from '../ui/admin-community-settings-ui-form'

interface AdminCommunityFeatureSettingsProps {
  children?: ReactNode
  organization: AdminCommunityGetResult
}

export function AdminCommunityFeatureSettings(props: AdminCommunityFeatureSettingsProps) {
  const { children, organization } = props
  const deleteCommunity = useAdminCommunityDelete()
  const navigate = useNavigate()
  const updateCommunity = useAdminCommunityUpdate()

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
    <>
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

      {children}

      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>Delete the community and all of its memberships.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminCommunitySettingsUiDeleteDialog
            isPending={deleteCommunity.isPending}
            onConfirm={handleDeleteCommunity}
          />
        </CardContent>
      </Card>
    </>
  )
}
