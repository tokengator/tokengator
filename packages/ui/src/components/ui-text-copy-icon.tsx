import type { ComponentProps } from 'react'
import { Copy, CopyCheck } from 'lucide-react'
import { type HandleCopyProps, useHandleCopyText } from '@tokengator/ui/hooks/use-handle-copy-text'
import { cn } from '@tokengator/ui/lib/utils'

type UiTextCopyIconProps = ComponentProps<'button'> & HandleCopyProps

function UiTextCopyIcon({
  'aria-label': ariaLabel,
  className,
  onClick,
  text,
  timeout,
  toast,
  toastFailed,
  type = 'button',
  ...props
}: UiTextCopyIconProps) {
  const { copied, handleCopy } = useHandleCopyText()
  const Icon = copied ? CopyCheck : Copy

  return (
    <button
      {...props}
      aria-label={ariaLabel ?? 'Copy text'}
      className={cn(
        'focus-visible:ring-ring/30 text-muted-foreground hover:text-foreground inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm transition-colors outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      onClick={(event) => {
        onClick?.(event)

        if (event.defaultPrevented) {
          return
        }

        void handleCopy({
          text,
          timeout,
          toast,
          toastFailed,
        })
      }}
      type={type}
    >
      <Icon className={cn('size-3.5', copied && 'text-green-500')} />
    </button>
  )
}

export { UiTextCopyIcon }
