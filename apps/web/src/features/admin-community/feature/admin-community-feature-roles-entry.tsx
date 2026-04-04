import { useState } from 'react'

import type { AdminCommunityMembershipSyncResult } from '../data-access/use-admin-community-membership-sync-apply'
import { type AdminCommunityDiscordSyncResult } from '../data-access/use-admin-community-discord-sync-apply'
import { useAdminCommunityRoleListQuery } from '../data-access/use-admin-community-role-list-query'
import { AdminCommunityDiscordSyncUiDetails } from '../ui/admin-community-discord-sync-ui-details'
import { AdminCommunityMembershipSyncUiDetails } from '../ui/admin-community-membership-sync-ui-details'
import { AdminCommunityFeatureAutomationHealth } from './admin-community-feature-automation-health'
import { AdminCommunityFeatureDiscordSync } from './admin-community-feature-discord-sync'
import { AdminCommunityFeatureMembershipSync } from './admin-community-feature-membership-sync'
import { AdminCommunityFeatureRoleCatalog } from './admin-community-feature-role-catalog'
import { AdminCommunityFeatureRoleMapping } from './admin-community-feature-role-mapping'

interface AdminCommunityFeatureRolesEntryProps {
  organizationId: string
}

export function AdminCommunityFeatureRolesEntry(props: AdminCommunityFeatureRolesEntryProps) {
  const { organizationId } = props
  const communityRoles = useAdminCommunityRoleListQuery(organizationId)
  const [discordSyncResult, setDiscordSyncResult] = useState<AdminCommunityDiscordSyncResult | null>(null)
  const [membershipSyncResult, setMembershipSyncResult] = useState<AdminCommunityMembershipSyncResult | null>(null)

  return (
    <AdminCommunityFeatureRoleMapping
      communityRoles={communityRoles.data?.communityRoles ?? []}
      onDiscordSyncResultReset={() => setDiscordSyncResult(null)}
      organizationId={organizationId}
    >
      {({ getRoleMappingPresentation }) => (
        <>
          <AdminCommunityFeatureAutomationHealth organizationId={organizationId} />
          <AdminCommunityFeatureMembershipSync
            onResultChange={setMembershipSyncResult}
            organizationId={organizationId}
            result={membershipSyncResult}
          />
          <AdminCommunityFeatureDiscordSync
            onResultChange={setDiscordSyncResult}
            organizationId={organizationId}
            result={discordSyncResult}
          />
          <AdminCommunityFeatureRoleCatalog
            communityRoles={communityRoles.data?.communityRoles ?? []}
            errorMessage={communityRoles.error?.message ?? null}
            getRoleMappingPresentation={getRoleMappingPresentation}
            isPending={communityRoles.isPending}
            membershipSyncResult={membershipSyncResult}
            onDiscordSyncResultReset={() => setDiscordSyncResult(null)}
            onMembershipSyncResultReset={() => setMembershipSyncResult(null)}
            organizationId={organizationId}
          />
          {membershipSyncResult ? <AdminCommunityMembershipSyncUiDetails result={membershipSyncResult} /> : null}
          {discordSyncResult ? <AdminCommunityDiscordSyncUiDetails result={discordSyncResult} /> : null}
        </>
      )}
    </AdminCommunityFeatureRoleMapping>
  )
}
