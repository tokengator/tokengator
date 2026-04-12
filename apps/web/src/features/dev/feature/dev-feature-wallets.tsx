import {
  DevUiShowcaseClusterDropdownCard,
  DevUiShowcaseWalletDialogCard,
  DevUiShowcaseWalletDropdownCard,
} from '../ui/dev-ui-showcase-wallet-cards'

export function DevFeatureWallets() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <DevUiShowcaseClusterDropdownCard />
      <DevUiShowcaseWalletDialogCard />
      <DevUiShowcaseWalletDropdownCard />
    </div>
  )
}
