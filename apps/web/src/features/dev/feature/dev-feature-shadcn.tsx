import {
  DevUiShowcaseAvatarCard,
  DevUiShowcaseButtonCard,
  DevUiShowcaseCardCard,
  DevUiShowcaseCheckboxCard,
  DevUiShowcaseInputCard,
  DevUiShowcaseLabelCard,
  DevUiShowcaseSeparatorCard,
  DevUiShowcaseSkeletonCard,
  DevUiShowcaseSwitchCard,
} from '../ui/dev-ui-showcase-basic-cards'
import { DevUiShowcaseItemCard } from '../ui/dev-ui-showcase-data-cards'
import {
  DevUiShowcaseDialogCard,
  DevUiShowcaseDropdownMenuCard,
  DevUiShowcaseSelectCard,
  DevUiShowcaseSonnerCard,
  DevUiShowcaseTabsCard,
} from '../ui/dev-ui-showcase-overlay-cards'

export function DevFeatureShadcn() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <DevUiShowcaseAvatarCard />
      <DevUiShowcaseButtonCard />
      <DevUiShowcaseCardCard />
      <DevUiShowcaseCheckboxCard />
      <DevUiShowcaseDialogCard />
      <DevUiShowcaseDropdownMenuCard />
      <DevUiShowcaseInputCard />
      <DevUiShowcaseItemCard />
      <DevUiShowcaseLabelCard />
      <DevUiShowcaseSelectCard />
      <DevUiShowcaseSeparatorCard />
      <DevUiShowcaseSkeletonCard />
      <DevUiShowcaseSonnerCard />
      <DevUiShowcaseSwitchCard />
      <DevUiShowcaseTabsCard />
    </div>
  )
}
