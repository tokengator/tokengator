import { createFileRoute } from '@tanstack/react-router'

import { DevFeatureWallets } from '@/features/dev/feature/dev-feature-wallets'

export const Route = createFileRoute('/dev/wallets')({
  component: RouteComponent,
})

function RouteComponent() {
  return <DevFeatureWallets />
}
