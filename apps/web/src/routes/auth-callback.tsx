import { createFileRoute, redirect } from '@tanstack/react-router'

import { finalizeDiscordAuthState } from '@/features/auth/data-access/finalize-discord-auth'
import { AuthFeatureCallbackPending } from '@/features/auth/feature/auth-feature-callback-pending'

export const Route = createFileRoute('/auth-callback')({
  beforeLoad: async ({ context }) => {
    const appAuthState = await finalizeDiscordAuthState(context.queryClient)

    throw redirect({ to: appAuthState.session ? appAuthState.authenticatedHomePath : '/login' })
  },
  component: RoutePendingComponent,
  pendingComponent: RoutePendingComponent,
  pendingMs: 0,
})

function RoutePendingComponent() {
  return <AuthFeatureCallbackPending />
}
