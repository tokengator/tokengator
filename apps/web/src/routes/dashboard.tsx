import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

import { requireCompletedOnboarding } from '@/features/organization/feature/organization-feature-active-access'
import { getOnboardingStatus } from '@/functions/get-onboarding-status'
import { getUser } from '@/functions/get-user'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const session = await getUser()
    const onboardingStatus = session ? await getOnboardingStatus() : null

    requireCompletedOnboarding({
      onboardingStatus,
      session,
    })
    return { session }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { session } = Route.useRouteContext()

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl">
        <CardHeader className="items-center text-center">
          <CardTitle className="text-3xl">Welcome back, {session?.user.name}</CardTitle>
          <CardDescription>@{session?.user.username}</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-center text-sm">
          Choose a section from the navigation to jump back into your work.
        </CardContent>
      </Card>
    </div>
  )
}
