import { setCommunityDiscordRoleSyncEnabled } from '../../../features/community-discord-connection'

import type { AdminOrganizationSetDiscordRoleSyncEnabledInput } from './admin-organization-set-discord-role-sync-enabled-input'
import { adminOrganizationGet } from './admin-organization-get'
import { adminOrganizationRecordGet } from './admin-organization-record-get'

export async function adminOrganizationSetDiscordRoleSyncEnabled(
  input: AdminOrganizationSetDiscordRoleSyncEnabledInput,
) {
  const existingOrganization = await adminOrganizationRecordGet(input.organizationId)

  if (!existingOrganization) {
    return {
      status: 'organization-not-found' as const,
    }
  }

  const connection = await setCommunityDiscordRoleSyncEnabled(input)

  if (!connection) {
    return {
      status: 'discord-connection-not-found' as const,
    }
  }

  const organization = await adminOrganizationGet(input.organizationId)

  if (!organization) {
    return {
      status: 'organization-updated-but-not-loaded' as const,
    }
  }

  return {
    organization,
    status: 'success' as const,
  }
}
