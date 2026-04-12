import { createFileRoute } from '@tanstack/react-router'

import { DevFeatureShadcn } from '@/features/dev/feature/dev-feature-shadcn'

export const Route = createFileRoute('/dev/shadcn')({
  component: RouteComponent,
})

function RouteComponent() {
  return <DevFeatureShadcn />
}
