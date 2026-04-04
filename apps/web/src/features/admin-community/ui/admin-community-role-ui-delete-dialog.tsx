import { Button } from '@tokengator/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tokengator/ui/components/dialog'

interface AdminCommunityRoleUiDeleteDialogProps {
  isPending: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
  roleName: string | null
}

export function AdminCommunityRoleUiDeleteDialog(props: AdminCommunityRoleUiDeleteDialogProps) {
  const { isPending, onConfirm, onOpenChange, open, roleName } = props

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Role</DialogTitle>
          <DialogDescription>Delete {roleName ?? 'this role'} and its backing Better Auth team?</DialogDescription>
        </DialogHeader>
        <DialogFooter className="border-t pt-3">
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Cancel
          </Button>
          <Button disabled={isPending || !roleName} onClick={onConfirm} type="button" variant="destructive">
            Delete Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
