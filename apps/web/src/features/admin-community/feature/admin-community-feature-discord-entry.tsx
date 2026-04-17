import { useEffect, useState } from 'react'
import type {
  AdminCommunityRoleApplyDiscordRoleSyncResult,
  AdminCommunityRolePreviewDiscordRoleSyncResult,
  AdminOrganizationDetailEntity,
} from '@tokengator/sdk'

import { useAdminCommunityGetQuery } from '../data-access/use-admin-community-get-query'
import { AdminCommunityDiscordSyncUiDetails } from '../ui/admin-community-discord-sync-ui-details'
import { AdminCommunityFeatureDiscordConnection } from './admin-community-feature-discord-connection'
import { AdminCommunityFeatureDiscordHealth } from './admin-community-feature-discord-health'
import { AdminCommunityFeatureDiscordSync } from './admin-community-feature-discord-sync'

type AdminCommunityDiscordSyncResult =
  | AdminCommunityRoleApplyDiscordRoleSyncResult
  | AdminCommunityRolePreviewDiscordRoleSyncResult

interface AdminCommunityFeatureDiscordEntryProps {
  initialOrganization: AdminOrganizationDetailEntity
}

export function AdminCommunityFeatureDiscordEntry(props: AdminCommunityFeatureDiscordEntryProps) {
  const { initialOrganization } = props
  const [discordSyncResult, setDiscordSyncResult] = useState<AdminCommunityDiscordSyncResult | null>(null)
  const { data } = useAdminCommunityGetQuery(initialOrganization.id, {
    initialData: initialOrganization,
  })

  useEffect(() => {
    setDiscordSyncResult(null)
  }, [data?.discordConnection?.guildId, data?.id])

  if (!data) {
    return null
  }

  return (
    <>
      <AdminCommunityFeatureDiscordConnection organization={data} />
      {data.discordConnection ? (
        <>
          <AdminCommunityFeatureDiscordHealth organizationId={data.id} />
          <AdminCommunityFeatureDiscordSync
            onResultChange={setDiscordSyncResult}
            organizationId={data.id}
            result={discordSyncResult}
            roleSyncEnabled={data.discordConnection.roleSyncEnabled}
          />
          {discordSyncResult ? <AdminCommunityDiscordSyncUiDetails result={discordSyncResult} /> : null}
        </>
      ) : null}
    </>
  )
}
