import { Card, CardContent } from '@tokengator/ui/components/card'

export function HomeUiAccessFlow({
  steps,
}: {
  steps: readonly {
    description: string
    title: string
  }[]
}) {
  return (
    <Card className="bg-card/90 border py-0 backdrop-blur">
      <CardContent className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
        <div className="space-y-2">
          <p className="text-muted-foreground text-[0.68rem] font-medium tracking-[0.28em] uppercase">Access flow</p>
          <h2 className="font-heading text-2xl font-medium">Sign in once. Verify everywhere.</h2>
        </div>
        <ol className="space-y-4">
          {steps.map((step, index) => (
            <li className="border-border/80 bg-background/40 rounded-none border px-4 py-3" key={step.title}>
              <p className="text-sm font-medium">{`${index + 1}. ${step.title}`}</p>
              <p className="text-muted-foreground mt-1 text-sm leading-6">{step.description}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
