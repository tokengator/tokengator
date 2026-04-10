import type { AdminOrganizationDetailEntity } from '@tokengator/sdk'

import { useAdminCommunityGetQuery } from '../data-access/use-admin-community-get-query'
import { AdminCommunityFeatureSettings } from './admin-community-feature-settings'
import { AdminCommunityFeatureSettingsDelete } from './admin-community-feature-settings-delete'

interface AdminCommunityFeatureSettingsEntryProps {
  initialOrganization: AdminOrganizationDetailEntity
}

export function AdminCommunityFeatureSettingsEntry(props: AdminCommunityFeatureSettingsEntryProps) {
  const { initialOrganization } = props
  const { data } = useAdminCommunityGetQuery(initialOrganization.id, {
    initialData: initialOrganization,
  })

  if (!data) {
    return null
  }

  return (
    <>
      <AdminCommunityFeatureSettings organization={data} />
      <AdminCommunityFeatureSettingsDelete organization={data} />
    </>
  )
}
