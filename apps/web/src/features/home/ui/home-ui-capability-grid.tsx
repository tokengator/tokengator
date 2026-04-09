import { HomeUiCapabilityCard } from './home-ui-capability-card'

export function HomeUiCapabilityGrid({
  items,
}: {
  items: readonly {
    description: string
    label: string
  }[]
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <HomeUiCapabilityCard description={item.description} key={item.label} label={item.label} />
      ))}
    </div>
  )
}
