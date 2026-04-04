import * as React from 'react'

import { cn } from '@tokengator/ui/lib/utils'

function UiInfoCard({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('rounded-lg border p-3 text-sm', className)} data-slot="ui-info-card" {...props} />
}

function UiInfoCardError({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('text-destructive text-xs', className)} data-slot="ui-info-card-error" {...props} />
}

function UiInfoCardLabel({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('text-muted-foreground', className)} data-slot="ui-info-card-label" {...props} />
}

function UiInfoCardMeta({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('text-muted-foreground text-xs', className)} data-slot="ui-info-card-meta" {...props} />
}

function UiInfoCardValue({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn(className)} data-slot="ui-info-card-value" {...props} />
}

export { UiInfoCard, UiInfoCardError, UiInfoCardLabel, UiInfoCardMeta, UiInfoCardValue }
