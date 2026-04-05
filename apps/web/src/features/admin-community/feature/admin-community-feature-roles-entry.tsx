import { AdminCommunityFeatureRoleCatalog } from './admin-community-feature-role-catalog'

export function AdminCommunityFeatureRolesEntry({ organizationId }: { organizationId: string }) {
  return <AdminCommunityFeatureRoleCatalog organizationId={organizationId} />
}
