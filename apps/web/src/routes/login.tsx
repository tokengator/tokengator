import { createFileRoute } from '@tanstack/react-router'

import { AuthFeatureSignIn } from '@/features/auth/feature/auth-feature-sign-in'

export const Route = createFileRoute('/login')({
  component: RouteComponent,
})

function RouteComponent() {
  return <AuthFeatureSignIn />
}
