import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@tokengator/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tokengator/ui/components/dialog'
import { Input } from '@tokengator/ui/components/input'

import { orpc } from '@/utils/orpc'

import { getAdminOrganizationQueryOptions } from './route'

export const Route = createFileRoute('/admin/communities/$organizationId/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { organizationId } = Route.useParams()
  const [formValues, setFormValues] = useState({
    logo: '',
    name: '',
    slug: '',
  })
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const organization = useQuery(getAdminOrganizationQueryOptions(organizationId))
  const deleteMutation = useMutation(
    orpc.adminOrganization.delete.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.adminOrganization.list.key(),
        })
        setIsDeleteDialogOpen(false)
        toast.success('Community deleted.')
        navigate({
          to: '/admin/communities',
        })
      },
    }),
  )
  const updateMutation = useMutation(
    orpc.adminOrganization.update.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async (updatedOrganization) => {
        await queryClient.invalidateQueries({
          queryKey: orpc.adminOrganization.get.key({
            input: {
              organizationId: updatedOrganization.id,
            },
          }),
        })
        await queryClient.invalidateQueries({
          queryKey: orpc.adminOrganization.list.key(),
        })
        toast.success('Community updated.')
      },
    }),
  )

  useEffect(() => {
    if (!organization.data) {
      return
    }

    setFormValues({
      logo: organization.data.logo ?? '',
      name: organization.data.name,
      slug: organization.data.slug,
    })
  }, [organization.data])

  function handleDeleteOrganization() {
    deleteMutation.mutate({
      organizationId,
    })
  }

  function handleSaveOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    updateMutation.mutate({
      data: {
        logo: formValues.logo || undefined,
        name: formValues.name,
        slug: formValues.slug,
      },
      organizationId,
    })
  }

  if (!organization.data) {
    return null
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Community Details</CardTitle>
          <CardDescription>Edit the core community fields.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSaveOrganization}>
            <div className="grid gap-1.5">
              <label className="text-sm" htmlFor="organization-detail-name">
                Name
              </label>
              <Input
                id="organization-detail-name"
                onChange={(event) =>
                  setFormValues((currentValues) => ({
                    ...currentValues,
                    name: event.target.value,
                  }))
                }
                required
                value={formValues.name}
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm" htmlFor="organization-detail-slug">
                Slug
              </label>
              <Input
                id="organization-detail-slug"
                onChange={(event) =>
                  setFormValues((currentValues) => ({
                    ...currentValues,
                    slug: event.target.value,
                  }))
                }
                required
                value={formValues.slug}
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm" htmlFor="organization-detail-logo">
                Logo URL
              </label>
              <Input
                id="organization-detail-logo"
                onChange={(event) =>
                  setFormValues((currentValues) => ({
                    ...currentValues,
                    logo: event.target.value,
                  }))
                }
                value={formValues.logo}
              />
            </div>
            <div className="flex justify-end">
              <Button disabled={updateMutation.isPending} type="submit">
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>Delete the community and all of its memberships.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button disabled={deleteMutation.isPending} onClick={() => setIsDeleteDialogOpen(true)} variant="destructive">
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Deleting
              </>
            ) : (
              'Delete Community'
            )}
          </Button>
          <Dialog onOpenChange={setIsDeleteDialogOpen} open={isDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Community</DialogTitle>
                <DialogDescription>Delete this community and all of its memberships?</DialogDescription>
              </DialogHeader>
              <DialogFooter className="border-t pt-3">
                <Button onClick={() => setIsDeleteDialogOpen(false)} type="button" variant="outline">
                  Cancel
                </Button>
                <Button
                  disabled={deleteMutation.isPending}
                  onClick={handleDeleteOrganization}
                  type="button"
                  variant="destructive"
                >
                  Delete Community
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}
