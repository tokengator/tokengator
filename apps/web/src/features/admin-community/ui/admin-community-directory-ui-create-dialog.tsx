import { Loader2, Plus } from 'lucide-react'
import type { AdminOrganizationCreateInput, AdminOrganizationOwnerCandidateEntity } from '@tokengator/sdk'
import { Button } from '@tokengator/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@tokengator/ui/components/dialog'
import { Input } from '@tokengator/ui/components/input'
import { Label } from '@tokengator/ui/components/label'
import { cn } from '@tokengator/ui/lib/utils'

interface AdminCommunityDirectoryUiCreateDialogProps {
  createValues: Pick<AdminOrganizationCreateInput, 'logo' | 'name' | 'slug'>
  isOpen: boolean
  isOwnerCandidatesPending: boolean
  isPending: boolean
  onLogoChange: (logo: string) => void
  onNameBlur: () => void
  onNameChange: (name: string) => void
  onOpenChange: (isOpen: boolean) => void
  onOwnerSearchChange: (search: string) => void
  onOwnerSelect: (owner: AdminOrganizationOwnerCandidateEntity) => void
  onSlugChange: (slug: string) => void
  onSubmit: () => void
  ownerCandidates: AdminOrganizationOwnerCandidateEntity[]
  ownerSearch: string
  selectedOwner: AdminOrganizationOwnerCandidateEntity
}

export function AdminCommunityDirectoryUiCreateDialog(props: AdminCommunityDirectoryUiCreateDialogProps) {
  const {
    createValues,
    isOpen,
    isOwnerCandidatesPending,
    isPending,
    onLogoChange,
    onNameBlur,
    onNameChange,
    onOpenChange,
    onOwnerSearchChange,
    onOwnerSelect,
    onSlugChange,
    onSubmit,
    ownerCandidates,
    ownerSearch,
    selectedOwner,
  } = props

  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogTrigger render={<Button data-icon="inline-start" />}>
        <Plus />
        Create Community
      </DialogTrigger>
      <DialogContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
        >
          <DialogHeader>
            <DialogTitle>Create Community</DialogTitle>
            <DialogDescription>
              Pick an existing user as the initial owner, then create the community with core defaults.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="organization-name">Name</Label>
              <Input
                id="organization-name"
                onBlur={onNameBlur}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="Acme Studios"
                required
                value={createValues.name}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="organization-slug">Slug</Label>
              <Input
                id="organization-slug"
                onChange={(event) => onSlugChange(event.target.value)}
                placeholder="acme-studios"
                required
                value={createValues.slug}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="organization-logo">Logo URL</Label>
              <Input
                id="organization-logo"
                onChange={(event) => onLogoChange(event.target.value)}
                placeholder="https://example.com/logo.png"
                value={createValues.logo}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="owner-search">Owner</Label>
              <Input
                id="owner-search"
                onChange={(event) => onOwnerSearchChange(event.target.value)}
                placeholder="Search by name or username"
                value={ownerSearch}
              />
              <div className="border">
                {isOwnerCandidatesPending ? (
                  <div className="text-muted-foreground flex items-center gap-2 px-3 py-4 text-sm">
                    <Loader2 className="size-4 animate-spin" />
                    Loading users
                  </div>
                ) : ownerCandidates.length ? (
                  <div className="max-h-56 overflow-y-auto">
                    {ownerCandidates.map((candidate) => {
                      const isSelected = candidate.id === selectedOwner.id

                      return (
                        <Button
                          aria-pressed={isSelected}
                          className={cn(
                            'h-auto w-full flex-col items-start justify-start gap-1 rounded-none border-b px-3 py-2 text-left font-normal last:border-b-0',
                          )}
                          key={candidate.id}
                          onClick={() => onOwnerSelect(candidate)}
                          type="button"
                          variant={isSelected ? 'secondary' : 'ghost'}
                        >
                          <span className="text-sm">{candidate.name}</span>
                          {candidate.username ? (
                            <span className="text-muted-foreground text-xs">@{candidate.username}</span>
                          ) : null}
                        </Button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-muted-foreground px-3 py-4 text-sm">No matching users found.</div>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                Selected owner:{' '}
                {selectedOwner.username ? `${selectedOwner.name} (@${selectedOwner.username})` : selectedOwner.name}
              </p>
            </div>
          </div>
          <DialogFooter className="border-t pt-3">
            <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={isPending} type="submit">
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating
                </>
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
