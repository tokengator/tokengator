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

interface AdminCommunityDiscordConnectionUiDeleteDialogProps {
  isPending: boolean
  onConfirm: () => Promise<boolean>
}

export function AdminCommunityDiscordConnectionUiDeleteDialog(
  props: AdminCommunityDiscordConnectionUiDeleteDialogProps,
) {
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
      <Button onClick={() => setIsOpen(true)} type="button" variant="destructive">
        Disconnect
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disconnect Discord Server</DialogTitle>
          <DialogDescription>Remove this community’s saved Discord server connection?</DialogDescription>
        </DialogHeader>
        <DialogFooter className="border-t pt-3">
          <Button onClick={() => setIsOpen(false)} type="button" variant="outline">
            Cancel
          </Button>
          <Button disabled={isPending} onClick={() => void handleConfirm()} type="button" variant="destructive">
            {isPending ? 'Disconnecting' : 'Disconnect'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
