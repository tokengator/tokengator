import {
  createSolanaDevnet,
  createSolanaLocalnet,
  createSolanaTestnet,
  createWalletUiConfig,
  WalletUi,
} from '@wallet-ui/react'
import { ClusterDropdown, WalletDialog, WalletDropdown } from '@tokengator/wallet-ui'

import { SolanaProvider } from '@/lib/solana-provider'
import { DevUiShowcaseCard, DevUiShowcaseVariant } from './dev-ui-showcase-card'

const walletUiShowcaseConfig = createWalletUiConfig({
  clusters: [createSolanaDevnet(), createSolanaLocalnet(), createSolanaTestnet()],
})

export function DevUiShowcaseClusterDropdownCard() {
  return (
    <DevUiShowcaseCard
      description="Reusable cluster selection dropdown built from @wallet-ui/react state and shared shadcn primitives."
      title="Cluster Dropdown"
    >
      <DevUiShowcaseVariant
        contentClassName="flex items-start justify-center border-0 bg-transparent p-0"
        description="Live preview of the exported ClusterDropdown component."
        title="Preview"
      >
        <WalletUi config={walletUiShowcaseConfig}>
          <ClusterDropdown />
        </WalletUi>
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}

export function DevUiShowcaseWalletDialogCard() {
  return (
    <DevUiShowcaseCard
      description="Reusable wallet selection dialog built from @wallet-ui/react state and shared shadcn primitives."
      title="Wallet Dialog"
    >
      <DevUiShowcaseVariant
        contentClassName="flex items-start justify-center border-0 bg-transparent p-0"
        description="Live preview of the exported WalletDialog component."
        title="Preview"
      >
        <SolanaProvider>
          <WalletDialog />
        </SolanaProvider>
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}

export function DevUiShowcaseWalletDropdownCard() {
  return (
    <DevUiShowcaseCard
      description="Reusable wallet connection dropdown built from @wallet-ui/react state and shared shadcn primitives."
      title="Wallet Dropdown"
    >
      <DevUiShowcaseVariant
        contentClassName="flex items-start justify-center border-0 bg-transparent p-0"
        description="Live preview of the exported WalletDropdown component."
        title="Preview"
      >
        <SolanaProvider>
          <WalletDropdown />
        </SolanaProvider>
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}
