import type { ReactNode, SubmitEvent } from 'react'
import { ellipsify } from '@wallet-ui/react'
import { useEffect, useState } from 'react'
import { Button } from '@tokengator/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { Input } from '@tokengator/ui/components/input'
import { UiTextCopyIcon } from '@tokengator/ui/components/ui-text-copy-icon'

export type ProfileSolanaWallet = {
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
  deletePendingWalletCounts,
  isConnected = false,
  onDeleteWallet,
  onDisconnect,
  onSetPrimaryWallet,
  onUpdateWallet,
  setPrimaryPendingWalletCounts,
  updatePendingWalletCounts,
  wallet,
}: {
  connectedWalletName?: string
  deletePendingWalletCounts: Record<string, number>
  isConnected?: boolean
  onDeleteWallet: (id: string) => Promise<boolean>
  onDisconnect?: () => void | Promise<void>
  onSetPrimaryWallet: (id: string) => Promise<boolean>
  onUpdateWallet: (input: { id: string; name: string }) => Promise<{ didSucceed: boolean; name: string | null }>
  setPrimaryPendingWalletCounts: Record<string, number>
  updatePendingWalletCounts: Record<string, number>
  wallet: ProfileSolanaWallet
}) {
  const [name, setName] = useState(wallet.name ?? '')
  const fallbackName = ellipsifySolanaWalletAddress(wallet.address)
  const isDeleting = Boolean(deletePendingWalletCounts[wallet.id])
  const isDirty = name !== (wallet.name ?? '')
  const isSettingPrimary = Boolean(setPrimaryPendingWalletCounts[wallet.id])
  const isUpdating = Boolean(updatePendingWalletCounts[wallet.id])
  const isBusy = isDeleting || isSettingPrimary || isUpdating

  useEffect(() => {
    setName(wallet.name ?? '')
  }, [wallet.name])

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isBusy || !isDirty) {
      return
    }

    const result = await onUpdateWallet({
      id: wallet.id,
      name,
    })

    if (result.didSucceed) {
      setName(result.name ?? '')
    }
  }

  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{wallet.displayName}</p>
          <div className="flex items-center gap-1.5">
            <p className="font-mono text-xs" title={wallet.address}>
              {fallbackName}
            </p>
            <UiTextCopyIcon text={wallet.address} title="Copy wallet address" toast="Wallet address copied." />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {wallet.isPrimary ? <p className="text-muted-foreground text-xs">Primary</p> : null}
          {!wallet.isPrimary ? (
            <>
              <Button disabled={isBusy} onClick={() => void onDeleteWallet(wallet.id)} size="sm" variant="destructive">
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
              <Button disabled={isBusy} onClick={() => void onSetPrimaryWallet(wallet.id)} size="sm" variant="outline">
                {isSettingPrimary ? 'Updating...' : 'Make Primary'}
              </Button>
            </>
          ) : null}
          {isConnected ? <p className="text-muted-foreground text-xs">Connected</p> : null}
          {isConnected && onDisconnect ? (
            <Button disabled={isBusy} onClick={() => void onDisconnect()} size="sm" variant="ghost">
              Disconnect
            </Button>
          ) : null}
        </div>
      </div>
      {connectedWalletName ? <p className="text-muted-foreground text-xs">Wallet app: {connectedWalletName}</p> : null}
      <form className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={handleSubmit}>
        <Input
          disabled={isBusy}
          onChange={(event) => setName(event.target.value)}
          placeholder={fallbackName}
          value={name}
        />
        <Button disabled={!isDirty || isBusy} size="sm" type="submit" variant="outline">
          {isUpdating ? 'Saving...' : 'Save'}
        </Button>
      </form>
      <p className="text-muted-foreground text-xs">Leave blank to use {fallbackName}.</p>
    </div>
  )
}

export function ProfileUiSolanaCard({
  clusterName,
  connectedWallet,
  deletePendingWalletCounts,
  isPending = false,
  linkActions,
  onDeleteWallet,
  onDisconnectWallet,
  onSetPrimaryWallet,
  onUpdateWallet,
  setPrimaryPendingWalletCounts,
  solanaWallets,
  updatePendingWalletCounts,
}: {
  clusterName: string
  connectedWallet: {
    address: string
    name: string
  } | null
  deletePendingWalletCounts: Record<string, number>
  isPending?: boolean
  linkActions: ReactNode
  onDeleteWallet: (id: string) => Promise<boolean>
  onDisconnectWallet?: () => void | Promise<void>
  onSetPrimaryWallet: (id: string) => Promise<boolean>
  onUpdateWallet: (input: { id: string; name: string }) => Promise<{ didSucceed: boolean; name: string | null }>
  setPrimaryPendingWalletCounts: Record<string, number>
  solanaWallets: ProfileSolanaWallet[]
  updatePendingWalletCounts: Record<string, number>
}) {
  const connectedLinkedWallet = connectedWallet
    ? (solanaWallets.find((entry) => entry.address === connectedWallet.address) ?? null)
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solana Wallets</CardTitle>
        <CardDescription>Link one or more Solana wallets on the configured {clusterName} cluster.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {connectedWallet && !connectedLinkedWallet ? (
          <div className="grid gap-2 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{connectedWallet.name}</p>
              <Button onClick={() => void onDisconnectWallet?.()} size="sm" variant="ghost">
                Disconnect
              </Button>
            </div>
            <div className="flex items-center gap-1.5">
              <p className="font-mono text-xs">{ellipsify(connectedWallet.address)}</p>
              <UiTextCopyIcon
                text={connectedWallet.address}
                title="Copy wallet address"
                toast="Wallet address copied."
              />
            </div>
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
                connectedWalletName={
                  connectedWallet?.address === linkedWallet.address ? connectedWallet.name : undefined
                }
                deletePendingWalletCounts={deletePendingWalletCounts}
                isConnected={connectedWallet?.address === linkedWallet.address}
                key={linkedWallet.id}
                onDeleteWallet={onDeleteWallet}
                onDisconnect={connectedWallet?.address === linkedWallet.address ? onDisconnectWallet : undefined}
                onSetPrimaryWallet={onSetPrimaryWallet}
                onUpdateWallet={onUpdateWallet}
                setPrimaryPendingWalletCounts={setPrimaryPendingWalletCounts}
                updatePendingWalletCounts={updatePendingWalletCounts}
                wallet={linkedWallet}
              />
            ))
          : null}
        {linkActions}
      </CardContent>
    </Card>
  )
}
