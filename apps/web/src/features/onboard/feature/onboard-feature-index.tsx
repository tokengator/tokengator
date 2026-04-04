import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@tokengator/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

import { authClient } from '@/features/auth/data-access/auth-client'
import { refreshAppAuthState } from '@/features/auth/data-access/get-app-auth-state'
import { useAppAuthStateQuery } from '@/features/auth/data-access/use-app-auth-state'
import { AuthFeatureSolanaActions } from '@/features/auth/feature/auth-feature-solana-actions'

export function OnboardFeatureIndex() {
  const navigate = useNavigate({
    from: '/onboard',
  })
  const queryClient = useQueryClient()
  const appAuthState = useAppAuthStateQuery()
  const [isDiscordPending, setIsDiscordPending] = useState(false)
  const hasDiscordAccount = appAuthState.data?.onboardingStatus?.hasDiscordAccount ?? false
  const hasRequirementsError = appAuthState.isError
  const hasSolanaWallet = appAuthState.data?.onboardingStatus?.hasSolanaWallet ?? false
  const hasUsername = appAuthState.data?.onboardingStatus?.hasUsername ?? false
  const isLoadingRequirements = appAuthState.isPending
  const isOnboardingComplete = appAuthState.data?.onboardingStatus?.isComplete ?? false

  useEffect(() => {
    if (!isOnboardingComplete) {
      return
    }

    void navigate({
      to: '/profile',
    })
  }, [isOnboardingComplete, navigate])

  async function handleDiscordLink() {
    const callbackURL = `${window.location.origin}/auth-callback`

    setIsDiscordPending(true)

    try {
      const response = (await authClient.$fetch('/link-social', {
        body: {
          callbackURL,
          errorCallbackURL: callbackURL,
          provider: 'discord',
        },
        method: 'POST',
      })) as { redirect: boolean; url: string }

      if (response.redirect && response.url) {
        window.location.href = response.url
        return
      }

      await refreshAppAuthState(queryClient)
      setIsDiscordPending(false)
    } catch (error) {
      setIsDiscordPending(false)
      toast.error(error instanceof Error ? error.message : 'Unable to link Discord')
    }
  }

  if (isLoadingRequirements) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Checking your account setup</CardTitle>
            <CardDescription>We&apos;re loading the required onboarding steps.</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading onboarding requirements
          </CardContent>
        </Card>
      </div>
    )
  }

  if (hasRequirementsError) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>We couldn&apos;t load your onboarding steps</CardTitle>
            <CardDescription>Try again to continue setting up your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">There was a problem checking your Discord or Solana setup.</p>
            <Button onClick={() => void refreshAppAuthState(queryClient)} variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!hasDiscordAccount) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Link Discord</CardTitle>
            <CardDescription>Connect a Discord account before continuing to Solana wallet setup.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              TokenGator requires at least one linked Discord account to finish onboarding.
            </p>
            <Button
              className="w-full"
              disabled={isDiscordPending}
              onClick={() => void handleDiscordLink()}
              type="button"
              variant="outline"
            >
              {isDiscordPending ? 'Redirecting to Discord...' : 'Link Discord'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!hasSolanaWallet) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Link a Solana wallet</CardTitle>
            <CardDescription>Connect at least one Solana wallet before finishing onboarding.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              TokenGator requires at least one linked Solana wallet to finish onboarding.
            </p>
            <AuthFeatureSolanaActions action="link" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!hasUsername) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Syncing your Discord username</CardTitle>
            <CardDescription>We use your Discord username as your TokenGator username.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Refresh this page if your Discord username does not appear automatically after linking.
            </p>
            <Button onClick={() => void refreshAppAuthState(queryClient)} type="button" variant="outline">
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Finishing onboarding</CardTitle>
          <CardDescription>We&apos;ll send you to your profile in a moment.</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Redirecting to your profile
        </CardContent>
      </Card>
    </div>
  )
}
