import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { env } from '@tokengator/env/web-client'

import { getAuthClientClient } from '@/features/auth/data-access/auth-client-client'
import { SolanaProvider } from '@/lib/solana-provider'

import { AuthUiSignInForm } from '../ui/auth-ui-sign-in-form'
import { AuthFeatureSolanaActions } from './auth-feature-solana-actions'

export function AuthFeatureSignIn() {
  const navigate = useNavigate({
    from: '/',
  })
  const [isDiscordPending, setIsDiscordPending] = useState(false)

  async function handleDiscordSignIn() {
    const authClientClient = getAuthClientClient()
    const callbackURL = `${env.API_URL}/auth-callback`

    setIsDiscordPending(true)

    try {
      await authClientClient.signIn.social({
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
        <SolanaProvider>
          <AuthFeatureSolanaActions
            action="verify"
            onSuccess={() => {
              void navigate({ to: '/onboard' })
              toast.success('Sign in successful')
            }}
          />
        </SolanaProvider>
      }
    />
  )
}
