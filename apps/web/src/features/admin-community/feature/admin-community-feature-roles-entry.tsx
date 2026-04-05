import { useState } from 'react'

import type { AdminCommunityMembershipSyncResult } from '../data-access/use-admin-community-membership-sync-apply'
import { type AdminCommunityDiscordSyncResult } from '../data-access/use-admin-community-discord-sync-apply'
import { AdminCommunityDiscordSyncUiDetails } from '../ui/admin-community-discord-sync-ui-details'
import { AdminCommunityMembershipSyncUiDetails } from '../ui/admin-community-membership-sync-ui-details'
import { AdminCommunityFeatureAutomationHealth } from './admin-community-feature-automation-health'
import { AdminCommunityFeatureDiscordSync } from './admin-community-feature-discord-sync'
import { AdminCommunityFeatureMembershipSync } from './admin-community-feature-membership-sync'
import { AdminCommunityFeatureRoleCatalog } from './admin-community-feature-role-catalog'
import { AdminCommunityFeatureRoleMapping } from './admin-community-feature-role-mapping'

export function AdminCommunityFeatureRolesEntry({ organizationId }: { organizationId: string }) {
  const [discordSyncResult, setDiscordSyncResult] = useState<AdminCommunityDiscordSyncResult | null>(null)
  const [membershipSyncResult, setMembershipSyncResult] = useState<AdminCommunityMembershipSyncResult | null>(null)

  return (
    <>
      <AdminCommunityFeatureRoleMapping organizationId={organizationId} />
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
        membershipSyncResult={membershipSyncResult}
        onDiscordSyncResultReset={() => setDiscordSyncResult(null)}
        onMembershipSyncResultReset={() => setMembershipSyncResult(null)}
        organizationId={organizationId}
      />
      {membershipSyncResult ? <AdminCommunityMembershipSyncUiDetails result={membershipSyncResult} /> : null}
      {discordSyncResult ? <AdminCommunityDiscordSyncUiDetails result={discordSyncResult} /> : null}
    </>
  )
}
