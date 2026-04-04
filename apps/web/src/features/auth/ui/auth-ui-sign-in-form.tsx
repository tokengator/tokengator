import type { ReactNode } from 'react'
import { Button } from '@tokengator/ui/components/button'

import { Loader } from '@/components/loader'

export function AuthUiSignInForm({
  isAppAuthPending,
  isDiscordPending,
  onDiscordSignIn,
  solanaActions,
}: {
  isAppAuthPending: boolean
  isDiscordPending: boolean
  onDiscordSignIn: () => void
  solanaActions: ReactNode
}) {
  if (isAppAuthPending) {
    return <Loader />
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-md p-6">
      <h1 className="mb-2 text-center text-3xl font-bold">Continue to TokenGator</h1>
      <p className="text-muted-foreground mb-6 text-center text-sm">Use Discord or your Solana wallet to sign in.</p>

      <Button className="w-full" disabled={isDiscordPending} onClick={onDiscordSignIn} type="button" variant="outline">
        {isDiscordPending ? 'Redirecting to Discord...' : 'Continue with Discord'}
      </Button>
      {solanaActions}
    </div>
  )
}
