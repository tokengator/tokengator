import { Card, CardContent } from '@tokengator/ui/components/card'

export function HomeUiCapabilityCard({ description, label }: { description: string; label: string }) {
  return (
    <Card className="bg-card/70 border py-0">
      <CardContent className="space-y-2 px-4 py-4">
        <p className="text-[0.68rem] font-medium tracking-[0.24em] uppercase">{label}</p>
        <p className="text-muted-foreground text-sm leading-6">{description}</p>
      </CardContent>
    </Card>
  )
}
