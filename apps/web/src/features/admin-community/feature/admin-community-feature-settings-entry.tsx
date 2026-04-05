import { type AdminCommunityGetResult, useAdminCommunityGetQuery } from '../data-access/use-admin-community-get-query'
import { AdminCommunityFeatureDiscordConnection } from './admin-community-feature-discord-connection'
import { AdminCommunityFeatureSettings } from './admin-community-feature-settings'
import { AdminCommunityFeatureSettingsDelete } from './admin-community-feature-settings-delete'

interface AdminCommunityFeatureSettingsEntryProps {
  initialOrganization: AdminCommunityGetResult
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
      <AdminCommunityFeatureDiscordConnection organization={data} />
      <AdminCommunityFeatureSettingsDelete organization={data} />
    </>
  )
}
