import { adminOrganizationFeatureCreate } from './admin-organization-feature-create'
import { adminOrganizationFeatureDelete } from './admin-organization-feature-delete'
import { adminOrganizationFeatureDeleteDiscordConnection } from './admin-organization-feature-delete-discord-connection'
import { adminOrganizationFeatureGet } from './admin-organization-feature-get'
import { adminOrganizationFeatureGetDiscordAnnouncementCatalog } from './admin-organization-feature-get-discord-announcement-catalog'
import { adminOrganizationFeatureList } from './admin-organization-feature-list'
import { adminOrganizationFeatureListOwnerCandidates } from './admin-organization-feature-list-owner-candidates'
import { adminOrganizationFeatureRefreshDiscordConnection } from './admin-organization-feature-refresh-discord-connection'
import { adminOrganizationFeatureRemoveMember } from './admin-organization-feature-remove-member'
import { adminOrganizationFeatureSetDiscordAnnouncementEnabled } from './admin-organization-feature-set-discord-announcement-enabled'
import { adminOrganizationFeatureSetDiscordRoleSyncEnabled } from './admin-organization-feature-set-discord-role-sync-enabled'
import { adminOrganizationFeatureTestDiscordAnnouncementChannel } from './admin-organization-feature-test-discord-announcement-channel'
import { adminOrganizationFeatureUpdate } from './admin-organization-feature-update'
import { adminOrganizationFeatureUpdateMemberRole } from './admin-organization-feature-update-member-role'
import { adminOrganizationFeatureUpsertDiscordAnnouncementConfig } from './admin-organization-feature-upsert-discord-announcement-config'
import { adminOrganizationFeatureUpsertDiscordConnection } from './admin-organization-feature-upsert-discord-connection'

export const adminOrganizationRouter = {
  create: adminOrganizationFeatureCreate,
  delete: adminOrganizationFeatureDelete,
  deleteDiscordConnection: adminOrganizationFeatureDeleteDiscordConnection,
  get: adminOrganizationFeatureGet,
  getDiscordAnnouncementCatalog: adminOrganizationFeatureGetDiscordAnnouncementCatalog,
  list: adminOrganizationFeatureList,
  listOwnerCandidates: adminOrganizationFeatureListOwnerCandidates,
  refreshDiscordConnection: adminOrganizationFeatureRefreshDiscordConnection,
  removeMember: adminOrganizationFeatureRemoveMember,
  setDiscordAnnouncementEnabled: adminOrganizationFeatureSetDiscordAnnouncementEnabled,
  setDiscordRoleSyncEnabled: adminOrganizationFeatureSetDiscordRoleSyncEnabled,
  testDiscordAnnouncementChannel: adminOrganizationFeatureTestDiscordAnnouncementChannel,
  update: adminOrganizationFeatureUpdate,
  updateMemberRole: adminOrganizationFeatureUpdateMemberRole,
  upsertDiscordAnnouncementConfig: adminOrganizationFeatureUpsertDiscordAnnouncementConfig,
  upsertDiscordConnection: adminOrganizationFeatureUpsertDiscordConnection,
}
