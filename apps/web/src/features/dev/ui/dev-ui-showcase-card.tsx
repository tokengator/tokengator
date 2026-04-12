import type { ComponentProps, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { cn } from '@tokengator/ui/lib/utils'

interface DevUiShowcaseCardProps extends Omit<ComponentProps<typeof Card>, 'title'> {
  description: ReactNode
  title: ReactNode
}

interface DevUiShowcaseVariantProps extends Omit<ComponentProps<'section'>, 'title'> {
  contentClassName?: string
  description?: ReactNode
  title: ReactNode
}

export function DevUiShowcaseCard({ children, className, description, title, ...props }: DevUiShowcaseCardProps) {
  return (
    <Card className={cn('h-full', className)} {...props}>
      <CardHeader className="border-b">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  )
}

export function DevUiShowcaseVariant({
  children,
  className,
  contentClassName,
  description,
  title,
  ...props
}: DevUiShowcaseVariantProps) {
  return (
    <section className={cn('grid gap-2', className)} {...props}>
      <div className="grid gap-0.5">
        <div className="text-sm font-medium">{title}</div>
        {description ? <div className="text-muted-foreground text-xs/relaxed">{description}</div> : null}
      </div>
      <div className={cn('rounded-md border p-3', contentClassName)}>{children}</div>
    </section>
  )
}
