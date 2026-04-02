import { Button } from '@tokengator/ui/components/button'

import { SolanaWalletActionButton } from '@/components/solana-wallet-action-button'
import { useSignInWallets } from '@/components/solana/use-sign-in-wallets'
import { Route as RootRoute } from '@/routes/__root'

export function SolanaAuthActions({ action, onSuccess }: { action: 'link' | 'verify'; onSuccess?: () => void }) {
  const { appConfig } = RootRoute.useRouteContext()
  const sortedWallets = useSignInWallets()

  if (action === 'verify' && !appConfig.solanaSignInEnabled) {
    return null
  }

  return (
    <div className="mt-2 space-y-2">
      {sortedWallets.length > 0 ? (
        sortedWallets.map((wallet) => (
          <SolanaWalletActionButton action={action} key={wallet.name} onSuccess={onSuccess} wallet={wallet} />
        ))
      ) : (
        <Button
          className="w-full"
          nativeButton={false}
          render={
            <a href="https://solana.com/solana-wallets" rel="noreferrer" target="_blank">
              Install a Solana wallet
            </a>
          }
          variant="outline"
        />
      )}
    </div>
  )
}
