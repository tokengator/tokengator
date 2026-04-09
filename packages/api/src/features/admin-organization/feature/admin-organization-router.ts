import { adminOrganizationFeatureCreate } from './admin-organization-feature-create'
import { adminOrganizationFeatureDelete } from './admin-organization-feature-delete'
import { adminOrganizationFeatureDeleteDiscordConnection } from './admin-organization-feature-delete-discord-connection'
import { adminOrganizationFeatureGet } from './admin-organization-feature-get'
import { adminOrganizationFeatureList } from './admin-organization-feature-list'
import { adminOrganizationFeatureListOwnerCandidates } from './admin-organization-feature-list-owner-candidates'
import { adminOrganizationFeatureRefreshDiscordConnection } from './admin-organization-feature-refresh-discord-connection'
import { adminOrganizationFeatureRemoveMember } from './admin-organization-feature-remove-member'
import { adminOrganizationFeatureUpdate } from './admin-organization-feature-update'
import { adminOrganizationFeatureUpdateMemberRole } from './admin-organization-feature-update-member-role'
import { adminOrganizationFeatureUpsertDiscordConnection } from './admin-organization-feature-upsert-discord-connection'

export const adminOrganizationRouter = {
  create: adminOrganizationFeatureCreate,
  delete: adminOrganizationFeatureDelete,
  deleteDiscordConnection: adminOrganizationFeatureDeleteDiscordConnection,
  get: adminOrganizationFeatureGet,
  list: adminOrganizationFeatureList,
  listOwnerCandidates: adminOrganizationFeatureListOwnerCandidates,
  refreshDiscordConnection: adminOrganizationFeatureRefreshDiscordConnection,
  removeMember: adminOrganizationFeatureRemoveMember,
  update: adminOrganizationFeatureUpdate,
  updateMemberRole: adminOrganizationFeatureUpdateMemberRole,
  upsertDiscordConnection: adminOrganizationFeatureUpsertDiscordConnection,
}
