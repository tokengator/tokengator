import { createFileRoute } from '@tanstack/react-router'

import { AdminCommunityFeatureSettingsEntry } from '@/features/admin-community/feature/admin-community-feature-settings-entry'
import { Route as CommunityRoute } from './route'

export const Route = createFileRoute('/admin/communities/$organizationId/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  const { organization } = CommunityRoute.useRouteContext()

  if (!organization) {
    return null
  }

  return <AdminCommunityFeatureSettingsEntry initialOrganization={organization} />
}
