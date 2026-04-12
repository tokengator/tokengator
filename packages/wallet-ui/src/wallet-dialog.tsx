'use client'

import { type UiWallet, useWalletUi, useWalletUiWallet, WalletUiIcon } from '@wallet-ui/react'
import { useState } from 'react'
import { Button } from '@tokengator/ui/components/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@tokengator/ui/components/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@tokengator/ui/components/dropdown-menu'
import { cn } from '@tokengator/ui/lib/utils'
import { formatWalletTriggerLabel, INSTALL_WALLETS_URL, sortWallets } from './wallet-utils'

function WalletDialogWalletItem({ onConnected, wallet }: { onConnected: () => void; wallet: UiWallet }) {
  const { connect } = useWalletUiWallet({ wallet })

  return (
    <Button
      className="w-full justify-start gap-2"
      onClick={() => {
        void connect().then(() => {
          onConnected()
        })
      }}
      variant="outline"
    >
      <WalletUiIcon className="size-4 shrink-0" wallet={wallet} />
      <span className="truncate">{wallet.name}</span>
    </Button>
  )
}

export interface WalletDialogProps {
  className?: string
}

export function WalletDialog({ className }: WalletDialogProps) {
  const [open, setOpen] = useState(false)
  const { account, connected, copy, disconnect, wallet, wallets } = useWalletUi()
  const sortedWallets = sortWallets(wallets)
  const triggerContent = (
    <>
      {connected && wallet ? <WalletUiIcon className="size-4 shrink-0" wallet={wallet} /> : null}
      <span className="truncate">
        {formatWalletTriggerLabel({ accountAddress: account?.address, connected, walletName: wallet?.name })}
      </span>
    </>
  )

  return (
    <>
      {connected ? (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button className={cn('justify-start gap-2', className)} variant="outline" />}>
            {triggerContent}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => copy()}>Copy address</DropdownMenuItem>
              <DropdownMenuItem onClick={() => disconnect()}>Disconnect</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="my-2" />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setOpen(true)}>Select Wallet</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button className={cn('justify-start gap-2', className)} onClick={() => setOpen(true)} variant="outline">
          {triggerContent}
        </Button>
      )}
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Wallet</DialogTitle>
            <DialogDescription>Connect a wallet on Solana to continue.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {sortedWallets.length > 0 ? (
              sortedWallets.map((availableWallet) => (
                <WalletDialogWalletItem
                  key={availableWallet.name}
                  onConnected={() => setOpen(false)}
                  wallet={availableWallet}
                />
              ))
            ) : (
              <Button
                className="w-full justify-start"
                nativeButton={false}
                render={<a href={INSTALL_WALLETS_URL} rel="noreferrer" target="_blank" />}
                variant="outline"
              >
                Install a Solana wallet
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
