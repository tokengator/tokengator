import { listCommunityDiscordSyncRuns, listCommunityMembershipSyncRuns } from '../../../features/community-role-sync'

import type { AdminCommunityRoleListRunsInput } from './admin-community-role-list-runs-input'
import { adminCommunityRoleOrganizationRecordGet } from './admin-community-role-organization-record-get'

export async function adminCommunityRoleListRuns(input: AdminCommunityRoleListRunsInput) {
  const existingOrganization = await adminCommunityRoleOrganizationRecordGet(input.organizationId)

  if (!existingOrganization) {
    return null
  }

  const limit = input.limit ?? 10

  return input.kind === 'discord'
    ? {
        kind: input.kind,
        runs: await listCommunityDiscordSyncRuns({
          limit,
          organizationId: input.organizationId,
        }),
      }
    : {
        kind: input.kind,
        runs: await listCommunityMembershipSyncRuns({
          limit,
          organizationId: input.organizationId,
        }),
      }
}
