import type { ReactNode } from 'react'
import { Button } from '@tokengator/ui/components/button'

export function AuthUiSignInForm({
  isDiscordPending,
  onDiscordSignIn,
  solanaActions,
}: {
  isDiscordPending: boolean
  onDiscordSignIn: () => void
  solanaActions: ReactNode
}) {
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
