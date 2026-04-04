import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ellipsify, useWalletUi } from '@wallet-ui/react'
import { type SubmitEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@tokengator/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { Input } from '@tokengator/ui/components/input'

import { SolanaWalletActionButton } from '@/components/solana-wallet-action-button'
import { useSignInWallets } from '@/components/solana/use-sign-in-wallets'
import { Route as RootRoute } from '@/routes/__root'
import { orpc } from '@/utils/orpc'

type ProfileSolanaWallet = {
  address: string
  displayName: string
  id: string
  isPrimary: boolean
  name: string | null
}

function ellipsifySolanaWalletAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-6)}`
}

function ProfileUiSolanaWalletRow({
  connectedWalletName,
  isConnected = false,
  onDisconnect,
  wallet,
}: {
  connectedWalletName?: string
  isConnected?: boolean
  onDisconnect?: () => void | Promise<void>
  wallet: ProfileSolanaWallet
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(wallet.name ?? '')
  const fallbackName = ellipsifySolanaWalletAddress(wallet.address)
  const isDirty = name !== (wallet.name ?? '')
  const setPrimaryMutation = useMutation(
    orpc.profile.setPrimarySolanaWallet.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.profile.listSolanaWallets.key(),
        })
        toast.success('Primary wallet updated.')
      },
    }),
  )
  const deleteMutation = useMutation(
    orpc.profile.deleteSolanaWallet.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.profile.listSolanaWallets.key(),
        })
        toast.success('Wallet deleted.')
      },
    }),
  )
  const updateMutation = useMutation(
    orpc.profile.updateSolanaWallet.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async ({ solanaWallet }) => {
        setName(solanaWallet.name ?? '')
        await queryClient.invalidateQueries({
          queryKey: orpc.profile.listSolanaWallets.key(),
        })
        toast.success('Wallet name updated.')
      },
    }),
  )

  useEffect(() => {
    setName(wallet.name ?? '')
  }, [wallet.name])

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    updateMutation.mutate({
      id: wallet.id,
      name,
    })
  }

  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{wallet.displayName}</p>
          <p className="font-mono text-xs">{wallet.address}</p>
        </div>
        <div className="flex items-center gap-3">
          {wallet.isPrimary ? <p className="text-muted-foreground text-xs">Primary</p> : null}
          {!wallet.isPrimary ? (
            <>
              <Button
                disabled={deleteMutation.isPending}
                onClick={() =>
                  deleteMutation.mutate({
                    id: wallet.id,
                  })
                }
                size="sm"
                variant="destructive"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
              <Button
                disabled={setPrimaryMutation.isPending}
                onClick={() =>
                  setPrimaryMutation.mutate({
                    id: wallet.id,
                  })
                }
                size="sm"
                variant="outline"
              >
                {setPrimaryMutation.isPending ? 'Updating...' : 'Make Primary'}
              </Button>
            </>
          ) : null}
          {isConnected ? <p className="text-muted-foreground text-xs">Connected</p> : null}
          {isConnected && onDisconnect ? (
            <Button onClick={() => void onDisconnect()} size="sm" variant="ghost">
              Disconnect
            </Button>
          ) : null}
        </div>
      </div>
      {connectedWalletName ? <p className="text-muted-foreground text-xs">Wallet app: {connectedWalletName}</p> : null}
      <form className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={handleSubmit}>
        <Input onChange={(event) => setName(event.target.value)} placeholder={fallbackName} value={name} />
        <Button disabled={!isDirty || updateMutation.isPending} size="sm" type="submit" variant="outline">
          {updateMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </form>
      <p className="text-muted-foreground text-xs">Leave blank to use {fallbackName}.</p>
    </div>
  )
}

export function ProfileUiSolanaCard({
  isPending = false,
  onLinked,
  solanaWallets,
}: {
  isPending?: boolean
  onLinked?: () => void | Promise<void>
  solanaWallets: ProfileSolanaWallet[]
}) {
  const { appConfig } = RootRoute.useRouteContext()
  const { account, disconnect, wallet } = useWalletUi()
  const sortedWallets = useSignInWallets()

  const connectedWalletAddress = account?.address ?? null
  const connectedLinkedWallet = connectedWalletAddress
    ? (solanaWallets.find((entry) => entry.address === connectedWalletAddress) ?? null)
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solana Wallets</CardTitle>
        <CardDescription>
          Link one or more Solana wallets on the configured {appConfig.solanaCluster} cluster.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {account && wallet && !connectedLinkedWallet ? (
          <div className="grid gap-2 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{wallet.name}</p>
              <Button onClick={() => void disconnect()} size="sm" variant="ghost">
                Disconnect
              </Button>
            </div>
            <p className="font-mono text-xs">{ellipsify(account.address)}</p>
            <p className="text-muted-foreground text-xs">
              This connected wallet is not linked yet, so it cannot be renamed.
            </p>
          </div>
        ) : null}
        {isPending ? <p className="text-muted-foreground">Loading linked wallets...</p> : null}
        {!isPending && solanaWallets.length === 0 ? (
          <p className="text-muted-foreground">No linked Solana wallets yet.</p>
        ) : null}
        {!isPending
          ? solanaWallets.map((linkedWallet) => (
              <ProfileUiSolanaWalletRow
                connectedWalletName={connectedWalletAddress === linkedWallet.address ? wallet?.name : undefined}
                isConnected={connectedWalletAddress === linkedWallet.address}
                key={linkedWallet.id}
                onDisconnect={connectedWalletAddress === linkedWallet.address ? () => disconnect() : undefined}
                wallet={linkedWallet}
              />
            ))
          : null}
        {sortedWallets.length > 0 ? (
          sortedWallets.map((availableWallet) => (
            <SolanaWalletActionButton
              action="link"
              key={availableWallet.name}
              onSuccess={onLinked}
              wallet={availableWallet}
            />
          ))
        ) : (
          <Button
            nativeButton={false}
            render={
              <a href="https://solana.com/solana-wallets" rel="noreferrer" target="_blank">
                Install a Solana wallet
              </a>
            }
            variant="outline"
          />
        )}
      </CardContent>
    </Card>
  )
}
