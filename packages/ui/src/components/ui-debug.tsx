import type { ComponentProps, ReactNode } from 'react'
import superjson from 'superjson'
import { cn } from '../lib/utils'

export type UiDebugProps = { data: string | unknown } & Omit<ComponentProps<'pre'>, 'children'>

export function UiDebug({ className, data, ...props }: UiDebugProps) {
  const content: ReactNode = typeof data === 'string' ? data : JSON.stringify(superjson.serialize(data).json, null, 2)

  return (
    <pre className={cn('overflow-auto text-[9px] whitespace-pre-wrap', className)} {...props}>
      {content}
    </pre>
  )
}
