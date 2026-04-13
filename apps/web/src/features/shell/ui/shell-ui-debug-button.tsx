import { useAppAuthStateQuery } from '@/features/auth/data-access/use-app-auth-state-query'
import { UiDebugDialog, type UiDebugDialogProps } from '@tokengator/ui/components/ui-debug-dialog.tsx'

export function ShellUiDebugButton(props: UiDebugDialogProps) {
  const { data: appAuthState } = useAppAuthStateQuery()

  if (appAuthState?.profileSettings?.settings.developerMode !== true) {
    return null
  }

  return <UiDebugDialog {...props} />
}
