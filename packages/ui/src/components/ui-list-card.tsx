import * as React from 'react'

import { cn } from '@tokengator/ui/lib/utils'

function UiListCard({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('grid gap-1 rounded-lg border p-3', className)} data-slot="ui-list-card" {...props} />
}

function UiListCardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex items-center justify-between gap-3', className)}
      data-slot="ui-list-card-header"
      {...props}
    />
  )
}

function UiListCardMeta({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('text-muted-foreground text-xs', className)} data-slot="ui-list-card-meta" {...props} />
}

export { UiListCard, UiListCardHeader, UiListCardMeta }
