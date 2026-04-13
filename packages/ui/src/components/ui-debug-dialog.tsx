import { Bug } from 'lucide-react'
import { Button } from '@tokengator/ui/components/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@tokengator/ui/components/dialog'
import { UiDebug, type UiDebugProps } from '@tokengator/ui/components/ui-debug'
import { cn } from '@tokengator/ui/lib/utils'

export type UiDebugDialogProps = UiDebugProps & { label?: string; triggerClassName?: string }

export function UiDebugDialog({
  className,
  data,
  label = 'Debug data',
  triggerClassName,
  ...props
}: UiDebugDialogProps) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            aria-label={label}
            className={triggerClassName}
            size="icon-sm"
            title={label}
            type="button"
            variant="outline"
          />
        }
      >
        <Bug />
        <span className="sr-only">{label}</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <UiDebug
          className={cn('bg-muted/40 max-h-[60vh] rounded-md p-3 font-mono text-[10px]', className)}
          data={data}
          {...props}
        />
      </DialogContent>
    </Dialog>
  )
}
