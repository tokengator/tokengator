import type { ReactNode } from 'react'

export function HomeUiHero({
  action,
  actionText,
  description,
  eyebrow,
  headline,
}: {
  action: ReactNode
  actionText: string
  description: string
  eyebrow: string
  headline: string
}) {
  return (
    <div className="space-y-7">
      <div className="space-y-4">
        <p className="text-muted-foreground text-[0.72rem] font-medium tracking-[0.32em] uppercase">{eyebrow}</p>
        <h1 className="font-heading max-w-4xl text-4xl leading-tight font-medium text-balance sm:text-5xl lg:text-6xl">
          {headline}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-base leading-7 sm:text-lg">{description}</p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {action}
        <p className="text-muted-foreground text-sm leading-6">{actionText}</p>
      </div>
    </div>
  )
}
