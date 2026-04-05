import { createFileRoute } from '@tanstack/react-router'

import { AdminCommunityFeatureDiscordEntry } from '@/features/admin-community/feature/admin-community-feature-discord-entry'
import { Route as CommunityRoute } from './route'

export const Route = createFileRoute('/admin/communities/$organizationId/discord')({
  component: RouteComponent,
})

function RouteComponent() {
  const { organization } = CommunityRoute.useRouteContext()

  if (!organization) {
    return null
  }

  return <AdminCommunityFeatureDiscordEntry initialOrganization={organization} key={organization.id} />
}
