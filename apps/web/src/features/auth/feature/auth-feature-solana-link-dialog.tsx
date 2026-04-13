import { ellipsify, type UiWallet, useWalletUi, useWalletUiWallet, WalletUiIcon } from '@wallet-ui/react'
import { ShieldCheck, Wallet } from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@tokengator/ui/components/accordion'
import { Button } from '@tokengator/ui/components/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@tokengator/ui/components/dialog'
import { cn } from '@tokengator/ui/lib/utils'

import { AuthFeatureSolanaWalletActionButton } from './auth-feature-solana-wallet-action-button'

const installWalletsUrl = 'https://solana.com/solana-wallets'
const initialStep = 'select-wallet'
const verifyStep = 'verify-wallet'

function AuthFeatureSolanaLinkDialogWalletItem({
  isSelected,
  onSelect,
  wallet,
}: {
  isSelected: boolean
  onSelect: (walletName: string) => void
  wallet: UiWallet
}) {
  const { connect, isConnecting } = useWalletUiWallet({ wallet })
  const isConnected = Boolean(wallet.accounts[0])
  const actionLabel = isSelected ? 'Selected' : isConnected ? 'Connected' : 'Connect'

  return (
    <Button
      className="w-full justify-between gap-3"
      disabled={isConnecting}
      onClick={() => {
        if (isConnected) {
          onSelect(wallet.name)
          return
        }

        void connect().then(() => {
          onSelect(wallet.name)
        })
      }}
      type="button"
      variant={isSelected ? 'secondary' : 'outline'}
    >
      <span className="flex min-w-0 items-center gap-2">
        <WalletUiIcon className="size-4 shrink-0" wallet={wallet} />
        <span className="truncate">{wallet.name}</span>
      </span>
      <span className="text-primary text-xs">{isConnecting ? 'Connecting...' : actionLabel}</span>
    </Button>
  )
}

function sortWallets(wallets: readonly UiWallet[]) {
  return [...wallets].sort((left, right) => left.name.localeCompare(right.name))
}

function AuthFeatureSolanaLinkDialogStep({
  children,
  disabled = false,
  icon,
  onOpen,
  title,
  value,
}: {
  children?: ReactNode
  disabled?: boolean
  icon: ReactNode
  onOpen: (value: string) => void
  title: string
  value: string
}) {
  return (
    <AccordionItem
      className="border-0 bg-transparent not-last:border-b-0 data-open:bg-transparent"
      disabled={disabled}
      value={value}
    >
      <div className="bg-card border-border overflow-hidden rounded-lg border">
        <AccordionTrigger
          className="hover:bg-muted/30 items-center gap-3 px-4 py-3 text-sm hover:no-underline"
          onClick={() => onOpen(value)}
        >
          <span
            className={cn(
              'flex min-w-0 items-center gap-2 truncate font-mono text-sm',
              disabled ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {icon}
            <span className="truncate">{title}</span>
          </span>
        </AccordionTrigger>
        <AccordionContent>{children}</AccordionContent>
      </div>
    </AccordionItem>
  )
}

export function AuthFeatureSolanaLinkDialog({
  linkedProviderIds,
  onSuccess,
}: {
  linkedProviderIds?: string[]
  onSuccess?: () => void | Promise<void>
}) {
  const [activeStep, setActiveStep] = useState(initialStep)
  const [open, setOpen] = useState(false)
  const [selectedWalletName, setSelectedWalletName] = useState<string | null>(null)
  const { account, wallet, wallets } = useWalletUi()
  const linkedProviderIdSet = useMemo(() => new Set(linkedProviderIds ?? []), [linkedProviderIds])
  const sortedWallets = useMemo(() => sortWallets(wallets), [wallets])
  const selectedWallet = sortedWallets.find((entry) => entry.name === selectedWalletName) ?? null
  const selectedWalletAccount = selectedWallet?.name === wallet?.name ? account : (selectedWallet?.accounts[0] ?? null)
  const isSelectedWalletLinked = Boolean(
    selectedWalletAccount && linkedProviderIdSet.has(selectedWalletAccount.address),
  )

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)

    if (nextOpen) {
      if (wallet?.name) {
        setSelectedWalletName(wallet.name)
        setActiveStep(verifyStep)
      } else {
        setActiveStep(initialStep)
        setSelectedWalletName(null)
      }

      return
    }

    setActiveStep(initialStep)
    setSelectedWalletName(null)
  }

  function handleWalletSelected(walletName: string) {
    setSelectedWalletName(walletName)
    setActiveStep(verifyStep)
  }

  function handleSelectAnotherWallet() {
    setActiveStep(initialStep)
    setSelectedWalletName(null)
  }

  return (
    <>
      <Button className="w-full" onClick={() => handleOpenChange(true)} type="button" variant="link">
        Link Solana Wallet
      </Button>
      <Dialog onOpenChange={handleOpenChange} open={open}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Link Solana Wallet</DialogTitle>
            <DialogDescription>Verify a wallet to link it to your account.</DialogDescription>
          </DialogHeader>
          <Accordion
            className="rounded-none border-0"
            onValueChange={(value) => value[0] && setActiveStep(value[0])}
            value={[activeStep]}
          >
            <div className="grid gap-3">
              <AuthFeatureSolanaLinkDialogStep
                icon={<Wallet className="size-4 shrink-0" />}
                onOpen={setActiveStep}
                title="Select wallet"
                value={initialStep}
              >
                <div className="grid gap-3">
                  {sortedWallets.length > 0 ? (
                    <>
                      <p className="text-muted-foreground text-xs">Detected wallets</p>
                      <div className="grid gap-2">
                        {sortedWallets.map((availableWallet) => (
                          <AuthFeatureSolanaLinkDialogWalletItem
                            isSelected={availableWallet.name === selectedWalletName}
                            key={availableWallet.name}
                            onSelect={handleWalletSelected}
                            wallet={availableWallet}
                          />
                        ))}
                      </div>
                    </>
                  ) : (
                    <Button
                      className="w-full justify-start"
                      nativeButton={false}
                      render={<a href={installWalletsUrl} rel="noreferrer" target="_blank" />}
                      variant="outline"
                    >
                      Install a Solana wallet
                    </Button>
                  )}
                </div>
              </AuthFeatureSolanaLinkDialogStep>

              <AuthFeatureSolanaLinkDialogStep
                disabled={!selectedWallet}
                icon={<ShieldCheck className="size-4 shrink-0" />}
                onOpen={setActiveStep}
                title="Verify wallet"
                value={verifyStep}
              >
                {selectedWallet ? (
                  <div className="grid gap-3">
                    <p className="text-muted-foreground text-xs">
                      Verify that you own this wallet to link it to your account.
                    </p>
                    <div className="border-border grid gap-2 rounded-md border p-3">
                      {selectedWalletAccount ? (
                        <div className="flex items-center gap-2">
                          <WalletUiIcon className="size-4 shrink-0" wallet={selectedWallet} />
                          <p className="truncate font-medium">{ellipsify(selectedWalletAccount.address)}</p>
                        </div>
                      ) : null}
                    </div>
                    {selectedWalletAccount ? (
                      isSelectedWalletLinked ? (
                        <>
                          <p className="text-muted-foreground text-xs">
                            This wallet is already linked to your account.
                          </p>
                          <div className="flex justify-end">
                            <Button onClick={handleSelectAnotherWallet} type="button" variant="outline">
                              Select Another Wallet
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <AuthFeatureSolanaWalletActionButton
                            action="link"
                            label={ellipsify(selectedWalletAccount.address)}
                            onSuccess={async () => {
                              setActiveStep(initialStep)
                              setOpen(false)
                              setSelectedWalletName(null)
                              await onSuccess?.()
                            }}
                            wallet={selectedWallet}
                          />
                          <Button
                            className="w-full"
                            onClick={handleSelectAnotherWallet}
                            type="button"
                            variant="secondary"
                          >
                            Select another wallet
                          </Button>
                        </>
                      )
                    ) : (
                      <p className="text-muted-foreground text-xs">Finish connecting this wallet to continue.</p>
                    )}
                  </div>
                ) : null}
              </AuthFeatureSolanaLinkDialogStep>
            </div>
          </Accordion>
        </DialogContent>
      </Dialog>
    </>
  )
}
