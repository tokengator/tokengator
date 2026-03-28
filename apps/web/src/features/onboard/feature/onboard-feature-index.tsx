import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@tokengator/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

import { useProfileListIdentities } from '@/features/profile/data-access/use-profile-list-identities'
import { useProfileListSolanaWallets } from '@/features/profile/data-access/use-profile-list-solana-wallets'
import { authClient } from '@/lib/auth-client'

import { SolanaAuthActions } from '@/components/solana-auth-actions'

interface OnboardFeatureIndexProps {
  initialSession: {
    user: {
      id: string
      username?: string | null
    }
  } | null
}

export function OnboardFeatureIndex({ initialSession }: OnboardFeatureIndexProps) {
  const navigate = useNavigate({
    from: '/onboard',
  })
  const { data: liveSession } = authClient.useSession()
  const [isDiscordPending, setIsDiscordPending] = useState(false)
  const session = liveSession ?? initialSession
  const identities = useProfileListIdentities(session?.user.id ?? '')
  const solanaWallets = useProfileListSolanaWallets(session?.user.id ?? '')
  const hasDiscordAccount = identities.data?.identities.some((identity) => identity.providerId === 'discord') ?? false
  const hasSolanaWallet = (solanaWallets.data?.solanaWallets.length ?? 0) > 0
  const hasUsername = Boolean(session?.user.username)
  const isLoadingRequirements = identities.isPending || solanaWallets.isPending
  const hasRequirementsError = identities.isError || solanaWallets.isError

  useEffect(() => {
    if (!hasDiscordAccount || !hasSolanaWallet || !hasUsername) {
      return
    }

    void navigate({
      to: '/profile',
    })
  }, [hasDiscordAccount, hasSolanaWallet, hasUsername, navigate])

  async function handleDiscordLink() {
    const callbackURL = `${window.location.origin}/onboard`

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

      await identities.refetch()
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
            <Button onClick={() => void Promise.all([identities.refetch(), solanaWallets.refetch()])} variant="outline">
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
            <SolanaAuthActions
              action="link"
              onSuccess={() => {
                void solanaWallets.refetch()
              }}
            />
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
            <Button onClick={() => window.location.reload()} type="button" variant="outline">
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
