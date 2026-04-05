import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'

import { authClient } from '@/features/auth/data-access/auth-client'

import { AuthUiSignInForm } from '../ui/auth-ui-sign-in-form'
import { AuthFeatureSolanaActions } from './auth-feature-solana-actions'

export function AuthFeatureSignIn() {
  const navigate = useNavigate({
    from: '/',
  })
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

  return (
    <AuthUiSignInForm
      isDiscordPending={isDiscordPending}
      onDiscordSignIn={() => {
        void handleDiscordSignIn()
      }}
      solanaActions={
        <AuthFeatureSolanaActions
          action="verify"
          onSuccess={() => {
            void navigate({ to: '/onboard' })
            toast.success('Sign in successful')
          }}
        />
      }
    />
  )
}
