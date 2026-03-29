import { createFileRoute, redirect } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

export const Route = createFileRoute('/auth-callback')({
  beforeLoad: async ({ context }) => {
    const { onboardingStatus, session } = context.appAuthState

    throw redirect({
      to: !session ? '/login' : onboardingStatus?.isComplete ? '/profile' : '/onboard',
    })
  },
  component: RoutePendingComponent,
  pendingComponent: RoutePendingComponent,
  pendingMs: 0,
})

function RoutePendingComponent() {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Finishing sign in</CardTitle>
          <CardDescription>We&apos;re reconnecting your session and sending you to the right screen.</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Completing authentication
        </CardContent>
      </Card>
    </div>
  )
}
