import { useWalletUi } from '@wallet-ui/react'
import { useMemo } from 'react'

export function useSignInWallets() {
  const { wallets } = useWalletUi()
  return useMemo(
    () =>
      [...wallets]
        .filter((wallet) => wallet.features?.includes('solana:signIn'))
        .sort((left, right) => left.name.localeCompare(right.name)),
    [wallets],
  )
}
