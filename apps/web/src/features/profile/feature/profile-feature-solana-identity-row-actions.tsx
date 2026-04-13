import { MoreHorizontal, PencilLine, PlugZap, Star, Trash2 } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import type { ProfileIdentityEntity, ProfileSolanaWalletEntity } from '@tokengator/sdk'
import { Button } from '@tokengator/ui/components/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tokengator/ui/components/dialog.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@tokengator/ui/components/dropdown-menu.tsx'
import { Input } from '@tokengator/ui/components/input.tsx'

export function ProfileFeatureSolanaIdentityRowActions({
  connectedWallet,
  deletingWalletCounts,
  identity,
  onDeleteWallet,
  onDisconnectWallet,
  onSetPrimaryWallet,
  onUpdateWallet,
  settingPrimaryWalletCounts,
  updatingWalletCounts,
  wallet,
}: {
  connectedWallet: {
    address: string
    name: string
  } | null
  deletingWalletCounts: Record<string, number>
  identity: ProfileIdentityEntity
  onDeleteWallet: (id: string) => Promise<boolean>
  onDisconnectWallet?: () => void | Promise<void>
  onSetPrimaryWallet: (id: string) => Promise<boolean>
  onUpdateWallet: (input: { id: string; name: string }) => Promise<{ didSucceed: boolean; name: string | null }>
  settingPrimaryWalletCounts: Record<string, number>
  updatingWalletCounts: Record<string, number>
  wallet: ProfileSolanaWalletEntity | null
}) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [name, setName] = useState(wallet?.name ?? '')

  useEffect(() => {
    setName(wallet?.name ?? '')
  }, [wallet?.name])

  const linkedWallet = wallet

  if (identity.referenceType !== 'solana_wallet' || !linkedWallet) {
    return null
  }

  const walletAddress = linkedWallet.address
  const walletDisplayName = linkedWallet.displayName
  const walletId = linkedWallet.id
  const walletIsPrimary = linkedWallet.isPrimary
  const walletNameInputId = `wallet-name-${walletId}`
  const walletName = linkedWallet.name
  const isConnected = connectedWallet?.address === walletAddress
  const isDeleting = Boolean(deletingWalletCounts[walletId])
  const isSettingPrimary = Boolean(settingPrimaryWalletCounts[walletId])
  const isUpdating = Boolean(updatingWalletCounts[walletId])
  const isBusy = isDeleting || isSettingPrimary || isUpdating
  const isDirty = name !== (walletName ?? '')

  async function handleDelete() {
    const didSucceed = await onDeleteWallet(walletId)

    if (didSucceed) {
      setIsDeleteOpen(false)
    }
  }

  async function handleUpdate() {
    if (isBusy || !isDirty) {
      return
    }

    const result = await onUpdateWallet({
      id: walletId,
      name,
    })

    if (result.didSucceed) {
      setIsEditOpen(false)
    }
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    await handleUpdate()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button aria-label="Open Solana wallet actions" size="icon-sm" variant="ghost" />}>
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem disabled={isBusy} onClick={() => setIsEditOpen(true)}>
            <PencilLine />
            Edit
          </DropdownMenuItem>
          {walletIsPrimary ? null : (
            <DropdownMenuItem disabled={isBusy} onClick={() => void onSetPrimaryWallet(walletId)}>
              <Star />
              {isSettingPrimary ? 'Updating...' : 'Make Primary'}
            </DropdownMenuItem>
          )}
          {isConnected && onDisconnectWallet ? (
            <DropdownMenuItem disabled={isBusy} onClick={() => void onDisconnectWallet()}>
              <PlugZap />
              Disconnect
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem disabled={isBusy} onClick={() => setIsDeleteOpen(true)} variant="destructive">
            <Trash2 />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog onOpenChange={setIsEditOpen} open={isEditOpen}>
        <DialogContent>
          <form className="grid gap-4" onSubmit={(event) => void handleEditSubmit(event)}>
            <DialogHeader>
              <DialogTitle>Edit Solana Wallet</DialogTitle>
              <DialogDescription>
                Set a display name for this wallet, or leave it blank to use the fallback.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor={walletNameInputId}>
                Wallet name
              </label>
              <Input
                disabled={isBusy}
                id={walletNameInputId}
                onChange={(event) => setName(event.target.value)}
                placeholder={walletDisplayName}
                value={name}
              />
              <p className="text-muted-foreground text-xs">Leave blank to use {walletDisplayName}.</p>
            </div>
            <DialogFooter className="border-t pt-3">
              <Button onClick={() => setIsEditOpen(false)} type="button" variant="outline">
                Cancel
              </Button>
              <Button disabled={!isDirty || isBusy} type="submit" variant="outline">
                {isUpdating ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setIsDeleteOpen} open={isDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Solana Wallet</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this identity? This action is irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t pt-3">
            <Button onClick={() => setIsDeleteOpen(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={isDeleting} onClick={() => void handleDelete()} type="button" variant="destructive">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
