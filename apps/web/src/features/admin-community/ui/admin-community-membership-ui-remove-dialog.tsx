import { Button } from '@tokengator/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tokengator/ui/components/dialog'

interface AdminCommunityMembershipUiRemoveDialogProps {
  isPending: boolean
  memberName: string | null
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
}

export function AdminCommunityMembershipUiRemoveDialog(props: AdminCommunityMembershipUiRemoveDialogProps) {
  const { isPending, memberName, onConfirm, onOpenChange, open } = props
  const descriptionName = memberName || 'this member'

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Member</DialogTitle>
          <DialogDescription>Remove {descriptionName} from this community?</DialogDescription>
        </DialogHeader>
        <DialogFooter className="border-t pt-3">
          <Button disabled={isPending} onClick={() => onOpenChange(false)} type="button" variant="outline">
            Cancel
          </Button>
          <Button disabled={isPending} onClick={onConfirm} type="button" variant="destructive">
            Remove Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
