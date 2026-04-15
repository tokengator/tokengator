import { createFileRoute } from '@tanstack/react-router'

import { DevFeatureApi } from '@/features/dev/feature/dev-feature-api'

export const Route = createFileRoute('/dev/api')({
  component: RouteComponent,
})

function RouteComponent() {
  return <DevFeatureApi />
}
