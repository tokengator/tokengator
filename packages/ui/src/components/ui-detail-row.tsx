import * as React from 'react'

import { cn } from '@tokengator/ui/lib/utils'

interface UiDetailRowProps extends React.ComponentProps<'div'> {
  align?: 'center' | 'start'
  label: React.ReactNode
  labelClassName?: string
  valueClassName?: string
}

function UiDetailRow({
  align = 'start',
  children,
  className,
  label,
  labelClassName,
  valueClassName,
  ...props
}: UiDetailRowProps) {
  return (
    <div
      className={cn('flex flex-col gap-1 md:flex-row md:gap-2', align === 'center' && 'md:items-center', className)}
      data-slot="ui-detail-row"
      {...props}
    >
      <div className={cn('text-muted-foreground', labelClassName)} data-slot="ui-detail-row-label">
        {label}
      </div>
      <div className={cn(valueClassName)} data-slot="ui-detail-row-value">
        {children}
      </div>
    </div>
  )
}

export { UiDetailRow }
