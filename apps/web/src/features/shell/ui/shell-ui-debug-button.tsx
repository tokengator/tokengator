import { Bug } from 'lucide-react'
import { Button } from '@tokengator/ui/components/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@tokengator/ui/components/dialog'
import { UiDebug } from '@tokengator/ui/components/ui-debug.tsx'

import { useAppAuthStateQuery } from '@/features/auth/data-access/use-app-auth-state-query'

interface ShellUiDebugButtonProps {
  className?: string
  data: unknown
  label?: string
}

export function ShellUiDebugButton({ className, data, label = 'Debug data' }: ShellUiDebugButtonProps) {
  const { data: appAuthState } = useAppAuthStateQuery()

  if (appAuthState?.profileSettings?.settings.developerMode !== true) {
    return null
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button aria-label={label} className={className} size="icon-sm" title={label} type="button" variant="ghost" />
        }
      >
        <Bug />
        <span className="sr-only">{label}</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <UiDebug className="bg-muted/40 max-h-[60vh] rounded-md p-3 font-mono text-[10px]" data={data} />
      </DialogContent>
    </Dialog>
  )
}
