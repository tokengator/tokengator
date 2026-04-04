import { useState } from 'react'
import { Button } from '@tokengator/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tokengator/ui/components/dialog'

interface AdminCommunitySettingsUiDeleteDialogProps {
  isPending: boolean
  onConfirm: () => Promise<boolean>
}

export function AdminCommunitySettingsUiDeleteDialog(props: AdminCommunitySettingsUiDeleteDialogProps) {
  const { isPending, onConfirm } = props
  const [isOpen, setIsOpen] = useState(false)

  async function handleConfirm() {
    const isSuccess = await onConfirm()

    if (isSuccess) {
      setIsOpen(false)
    }
  }

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <Button disabled={isPending} onClick={() => setIsOpen(true)} type="button" variant="destructive">
        {isPending ? 'Deleting' : 'Delete Community'}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Community</DialogTitle>
          <DialogDescription>Delete this community and all of its memberships?</DialogDescription>
        </DialogHeader>
        <DialogFooter className="border-t pt-3">
          <Button onClick={() => setIsOpen(false)} type="button" variant="outline">
            Cancel
          </Button>
          <Button disabled={isPending} onClick={() => void handleConfirm()} type="button" variant="destructive">
            Delete Community
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
