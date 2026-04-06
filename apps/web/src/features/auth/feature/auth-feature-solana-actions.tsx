import { type UiWallet, useWalletUi } from '@wallet-ui/react'
import { Button } from '@tokengator/ui/components/button'

import { Route as RootRoute } from '@/routes/__root'
import { AuthFeatureSolanaWalletActionButton } from './auth-feature-solana-wallet-action-button'

function getSignInWallets(wallets: readonly UiWallet[]) {
  return [...wallets]
    .filter((wallet) => wallet.features?.includes('solana:signIn'))
    .sort((left, right) => left.name.localeCompare(right.name))
}

export function AuthFeatureSolanaActions({ action, onSuccess }: { action: 'link' | 'verify'; onSuccess?: () => void }) {
  const { appConfig } = RootRoute.useRouteContext()
  const { wallets } = useWalletUi()
  const signInWallets = getSignInWallets(wallets)

  if (action === 'verify' && !appConfig.solanaSignInEnabled) {
    return null
  }

  return (
    <div className="mt-2 space-y-2">
      {signInWallets.length > 0 ? (
        signInWallets.map((wallet) => (
          <AuthFeatureSolanaWalletActionButton
            action={action}
            key={wallet.name}
            onSuccess={onSuccess}
            wallet={wallet}
          />
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
