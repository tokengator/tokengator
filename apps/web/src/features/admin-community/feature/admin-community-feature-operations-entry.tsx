import { useEffect, useState } from 'react'
import type { AdminCommunityRolePreviewSyncResult } from '@tokengator/sdk'

import { AdminCommunityMembershipSyncUiDetails } from '../ui/admin-community-membership-sync-ui-details'
import { AdminCommunityFeatureMembershipSync } from './admin-community-feature-membership-sync'
import { AdminCommunityFeatureOperationsHealth } from './admin-community-feature-operations-health'

interface AdminCommunityFeatureOperationsEntryProps {
  organizationId: string
}

export function AdminCommunityFeatureOperationsEntry(props: AdminCommunityFeatureOperationsEntryProps) {
  const { organizationId } = props
  const [membershipSyncResult, setMembershipSyncResult] = useState<AdminCommunityRolePreviewSyncResult | null>(null)

  useEffect(() => {
    setMembershipSyncResult(null)
  }, [organizationId])

  return (
    <>
      <AdminCommunityFeatureMembershipSync
        onResultChange={setMembershipSyncResult}
        organizationId={organizationId}
        result={membershipSyncResult}
      />
      {membershipSyncResult ? <AdminCommunityMembershipSyncUiDetails result={membershipSyncResult} /> : null}
      <AdminCommunityFeatureOperationsHealth organizationId={organizationId} />
    </>
  )
}
