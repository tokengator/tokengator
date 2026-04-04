import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@tokengator/ui/components/button'

import { useAppAuthStateQuery } from '@/features/auth/data-access/use-app-auth-state'
import { authClient } from '@/lib/auth-client'

import { Loader } from './loader'
import { SolanaAuthActions } from './solana-auth-actions'

export function SignInForm() {
  const navigate = useNavigate({
    from: '/',
  })
  const { isPending } = useAppAuthStateQuery()
  const [isDiscordPending, setIsDiscordPending] = useState(false)

  async function handleDiscordSignIn() {
    const callbackURL = `${window.location.origin}/auth-callback`

    setIsDiscordPending(true)

    try {
      await authClient.signIn.social({
        callbackURL,
        errorCallbackURL: callbackURL,
        newUserCallbackURL: callbackURL,
        provider: 'discord',
      })
    } catch (error) {
      setIsDiscordPending(false)
      toast.error(error instanceof Error ? error.message : 'Unable to sign in with Discord')
    }
  }

  if (isPending) {
    return <Loader />
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-md p-6">
      <h1 className="mb-2 text-center text-3xl font-bold">Continue to TokenGator</h1>
      <p className="text-muted-foreground mb-6 text-center text-sm">Use Discord or your Solana wallet to sign in.</p>

      <Button
        className="w-full"
        disabled={isDiscordPending}
        onClick={() => void handleDiscordSignIn()}
        type="button"
        variant="outline"
      >
        {isDiscordPending ? 'Redirecting to Discord...' : 'Continue with Discord'}
      </Button>
      <SolanaAuthActions
        action="verify"
        onSuccess={() => {
          navigate({
            to: '/onboard',
          })
          toast.success('Sign in successful')
        }}
      />
    </div>
  )
}
