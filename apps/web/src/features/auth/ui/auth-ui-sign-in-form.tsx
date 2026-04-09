import type { ReactNode } from 'react'
import { Button } from '@tokengator/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

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
    <div className="relative flex min-h-full items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(119,178,85,0.18),transparent_32%),radial-gradient(circle_at_bottom,rgba(62,114,29,0.14),transparent_24%)]"
      />
      <Card className="bg-card/95 relative w-full max-w-xl border py-0 backdrop-blur">
        <CardHeader className="gap-4 border-b px-6 py-6 sm:px-8">
          <div className="space-y-1">
            <p className="text-muted-foreground text-[0.7rem] font-medium tracking-[0.28em] uppercase">Sign in</p>
            <CardTitle className="text-xl sm:text-2xl">Continue to TokenGator</CardTitle>
            <CardDescription className="max-w-lg text-sm leading-6">
              Use Discord or your Solana wallet to verify your identity and continue.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-6 py-6 sm:px-8">
          <div className="space-y-3 [&_[data-slot=button]]:h-11 [&_[data-slot=button]]:justify-center [&_[data-slot=button]]:text-sm">
            <Button
              className="w-full"
              disabled={isDiscordPending}
              onClick={onDiscordSignIn}
              type="button"
              variant="outline"
            >
              {isDiscordPending ? 'Redirecting to Discord...' : 'Continue with Discord'}
            </Button>
            <div aria-labelledby="wallet-sign-in-label" className="space-y-3" role="group">
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="border-border w-full border-t" />
                </div>
                <div className="relative flex justify-center">
                  <span
                    className="bg-card text-muted-foreground px-2 text-[0.7rem] tracking-[0.24em] uppercase"
                    id="wallet-sign-in-label"
                  >
                    Wallet sign-in
                  </span>
                </div>
              </div>
              {solanaActions}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
