import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ellipsify, type UiWallet, useSignIn, useWalletUiWallet, WalletUiIcon } from '@wallet-ui/react'
import { toast } from 'sonner'
import { Button } from '@tokengator/ui/components/button'

import { refreshAppAuthState } from '@/features/auth/data-access/get-app-auth-state'
import { handleSiwsAuth } from '@/features/auth/data-access/handle-siws-auth'

function getActionErrorMessage(action: 'link' | 'verify') {
  switch (action) {
    case 'link':
      return 'Unable to link wallet'
    case 'verify':
      return 'Unable to sign in with Solana'
  }
}

function getActionLabel(action: 'link' | 'verify', walletLabel: string) {
  switch (action) {
    case 'link':
      return `Verify wallet`
    case 'verify':
      return `Continue with ${walletLabel}`
  }
}

function getActionStatement(action: 'link' | 'verify') {
  switch (action) {
    case 'link':
      return 'Link this Solana wallet to TokenGator'
    case 'verify':
      return 'Sign in to TokenGator'
  }
}

function getSuccessMessage(action: 'link' | 'verify') {
  switch (action) {
    case 'link':
      return 'Wallet linked'
    case 'verify':
      return 'Sign in successful'
  }
}

export function AuthFeatureSolanaWalletActionButton({
  action,
  label,
  onSuccess,
  wallet,
}: {
  action: 'link' | 'verify'
  label?: string
  onSuccess?: () => void | Promise<void>
  wallet: UiWallet
}) {
  const queryClient = useQueryClient()
  const signIn = useSignIn(wallet)
  const { connect, isConnecting } = useWalletUiWallet({ wallet })
  const account = wallet.accounts[0]
  const walletLabel = label ?? (account?.address ? ellipsify(account.address) : wallet.name)
  const mutation = useMutation({
    mutationFn: async () => {
      if (!account) {
        throw new Error('Connect a wallet before continuing')
      }

      return handleSiwsAuth({
        action,
        address: account.address,
        refresh: async () => {
          await refreshAppAuthState(queryClient)
        },
        signIn,
        statement: getActionStatement(action),
      })
    },
    onError: (error) => {
      toast.error(getActionErrorMessage(action), {
        description: error instanceof Error ? error.message : String(error),
      })
    },
    onSuccess: async () => {
      toast.success(getSuccessMessage(action))
      await onSuccess?.()
    },
  })

  if (!account) {
    return (
      <Button
        className="w-full justify-start gap-2"
        disabled={isConnecting}
        onClick={() => void connect()}
        variant="outline"
      >
        <WalletUiIcon className="size-4" wallet={wallet} />
        {isConnecting ? `Connecting ${wallet.name}...` : `Connect ${walletLabel}`}
      </Button>
    )
  }

  return (
    <Button className="w-full gap-2" disabled={mutation.isPending} onClick={() => mutation.mutate()} variant="outline">
      <WalletUiIcon className="size-4" wallet={wallet} />
      {mutation.isPending ? `${getActionLabel(action, walletLabel)}...` : getActionLabel(action, walletLabel)}
    </Button>
  )
}
