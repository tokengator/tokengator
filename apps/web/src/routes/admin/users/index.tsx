import { createFileRoute } from '@tanstack/react-router'

import { AdminUserFeatureDirectory } from '@/features/admin-user/feature/admin-user-feature-directory'

export const Route = createFileRoute('/admin/users/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <AdminUserFeatureDirectory />
}
