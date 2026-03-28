import { Button } from '@tokengator/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tokengator/ui/components/dialog'

interface AdminAssetGroupUiDeleteDialogProps {
  assetGroupLabel: string
  isPending: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
}

export function AdminAssetGroupUiDeleteDialog(props: AdminAssetGroupUiDeleteDialogProps) {
  const { assetGroupLabel, isPending, onConfirm, onOpenChange, open } = props

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Asset Group</DialogTitle>
          <DialogDescription>Delete {assetGroupLabel} and all assets in this group?</DialogDescription>
        </DialogHeader>
        <DialogFooter className="border-t pt-3">
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Cancel
          </Button>
          <Button disabled={isPending} onClick={onConfirm} type="button" variant="destructive">
            Delete Asset Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
