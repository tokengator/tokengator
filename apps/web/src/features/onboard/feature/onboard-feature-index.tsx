import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { env } from '@tokengator/env/web-client'
import { Button } from '@tokengator/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

import { getAuthClientClient } from '@/features/auth/data-access/auth-client-client'
import { finalizeDiscordAuthState } from '@/features/auth/data-access/finalize-discord-auth'
import { refreshAppAuthState } from '@/features/auth/data-access/get-app-auth-state'
import { useAppAuthStateQuery } from '@/features/auth/data-access/use-app-auth-state-query'
import { AuthFeatureSolanaActions } from '@/features/auth/feature/auth-feature-solana-actions'
import { SolanaProvider } from '@/lib/solana-provider'

export function OnboardFeatureIndex() {
  const navigate = useNavigate({
    from: '/onboard',
  })
  const queryClient = useQueryClient()
  const { data } = useAppAuthStateQuery()
  const [isDiscordPending, setIsDiscordPending] = useState(false)
  const [isUsernamePending, setIsUsernamePending] = useState(false)
  const hasDiscordAccount = data?.onboardingStatus?.hasDiscordAccount ?? false
  const hasSolanaWallet = data?.onboardingStatus?.hasSolanaWallet ?? false
  const hasUsername = data?.onboardingStatus?.hasUsername ?? false
  const isOnboardingComplete = data?.isOnboardingComplete ?? false

  useEffect(() => {
    if (!isOnboardingComplete) {
      return
    }

    void navigate({ to: '/profile' })
  }, [isOnboardingComplete, navigate])

  async function handleDiscordLink() {
    const authClientClient = getAuthClientClient()
    const callbackURL = `${env.API_URL}/auth-callback`

    setIsDiscordPending(true)

    try {
      const response = (await authClientClient.$fetch('/link-social', {
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

  async function handleUsernameRetry() {
    setIsUsernamePending(true)

    try {
      const appAuthState = await finalizeDiscordAuthState(queryClient)

      if (!appAuthState?.onboardingStatus?.hasUsername) {
        toast.error('Unable to sync Discord username')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to sync Discord username')
    } finally {
      setIsUsernamePending(false)
    }
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
            <SolanaProvider>
              <AuthFeatureSolanaActions action="link" />
            </SolanaProvider>
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
              Your username should sync during Discord sign-in or link. Retry sync if it does not appear automatically.
            </p>
            <Button
              disabled={isUsernamePending}
              onClick={() => void handleUsernameRetry()}
              type="button"
              variant="outline"
            >
              {isUsernamePending ? 'Syncing...' : 'Retry sync'}
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
