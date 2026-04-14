import {
  DevUiShowcaseUiDebugCard,
  DevUiShowcaseUiDetailRowCard,
  DevUiShowcaseUiFacetFilterCard,
  DevUiShowcaseUiInfoCardCard,
  DevUiShowcaseUiListCardCard,
  DevUiShowcaseUiStatusCard,
  DevUiShowcaseUiTableCard,
  DevUiShowcaseUiTextCopyIconCard,
} from '../ui/dev-ui-showcase-data-cards'

export function DevFeatureUi() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <DevUiShowcaseUiDebugCard />
      <DevUiShowcaseUiDetailRowCard />
      <DevUiShowcaseUiFacetFilterCard />
      <DevUiShowcaseUiInfoCardCard />
      <DevUiShowcaseUiListCardCard />
      <DevUiShowcaseUiStatusCard />
      <DevUiShowcaseUiTableCard />
      <DevUiShowcaseUiTextCopyIconCard />
    </div>
  )
}
