import { createFileRoute } from '@tanstack/react-router'

import { DevFeatureUi } from '@/features/dev/feature/dev-feature-ui'

export const Route = createFileRoute('/dev/ui')({
  component: RouteComponent,
})

function RouteComponent() {
  return <DevFeatureUi />
}
