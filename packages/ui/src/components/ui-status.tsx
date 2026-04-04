import { type VariantProps, cva } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@tokengator/ui/lib/utils'

const uiStatusVariants = cva('border px-2 py-1 text-xs font-medium', {
  defaultVariants: {
    casing: 'default',
    tone: 'default',
  },
  variants: {
    casing: {
      default: '',
      uppercase: 'uppercase',
    },
    tone: {
      default: '',
      destructive: 'border-red-600/30 bg-red-600/10 text-red-700',
      neutral: 'border-slate-500/30 bg-slate-500/10 text-slate-700',
      notice: 'border-orange-600/30 bg-orange-600/10 text-orange-700',
      success: 'border-emerald-600/30 bg-emerald-600/10 text-emerald-700',
      warning: 'border-amber-600/30 bg-amber-600/10 text-amber-700',
    },
  },
})

type UiStatusVariants = VariantProps<typeof uiStatusVariants>
type UiStatusProps = React.ComponentProps<'span'> & UiStatusVariants

function UiStatus({ casing, className, tone, ...props }: UiStatusProps) {
  return <span className={cn(uiStatusVariants({ casing, tone }), className)} data-slot="ui-status" {...props} />
}

export type { UiStatusProps }
export type { UiStatusVariants }
export { UiStatus, uiStatusVariants }
