import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2, Plus } from 'lucide-react'
import { type FormEvent, useDeferredValue, useEffect, useState } from 'react'
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
  DialogTrigger,
} from '@tokengator/ui/components/dialog'
import { Input } from '@tokengator/ui/components/input'
import { cn } from '@tokengator/ui/lib/utils'

import { authClient } from '@/lib/auth-client'
import { orpc } from '@/utils/orpc'

const defaultCreateValues = {
  logo: '',
  name: '',
  slug: '',
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString()
}

function formatOwnerSummary(owner: { email: string; name: string; username?: string | null }) {
  return owner.username ? `${owner.name} (@${owner.username}, ${owner.email})` : `${owner.name} (${owner.email})`
}

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

export const Route = createFileRoute('/admin/communities/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: session } = authClient.useSession()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [createValues, setCreateValues] = useState(defaultCreateValues)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [organizationSearch, setOrganizationSearch] = useState('')
  const [ownerSearch, setOwnerSearch] = useState('')
  const [selectedOwnerId, setSelectedOwnerId] = useState('')
  const deferredOrganizationSearch = useDeferredValue(organizationSearch)
  const deferredOwnerSearch = useDeferredValue(ownerSearch)
  const normalizedOrganizationSearch = deferredOrganizationSearch.trim()
  const normalizedOwnerSearch = deferredOwnerSearch.trim()
  const sessionOwnerId = session?.user.id ?? ''

  const organizations = useQuery(
    orpc.adminOrganization.list.queryOptions({
      input: {
        limit: 25,
        search: normalizedOrganizationSearch || undefined,
      },
    }),
  )
  const ownerCandidates = useQuery(
    orpc.adminOrganization.listOwnerCandidates.queryOptions({
      enabled: isCreateDialogOpen,
      input: {
        limit: 10,
        search: normalizedOwnerSearch || undefined,
      },
    }),
  )
  const createMutation = useMutation(
    orpc.adminOrganization.create.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async (organization) => {
        await queryClient.invalidateQueries({
          queryKey: orpc.adminOrganization.list.key(),
        })
        setCreateValues(defaultCreateValues)
        setIsCreateDialogOpen(false)
        setOwnerSearch('')
        setSelectedOwnerId(sessionOwnerId)
        toast.success('Community created.')
        navigate({
          params: {
            organizationId: organization.id,
          },
          to: '/admin/communities/$organizationId',
        })
      },
    }),
  )

  useEffect(() => {
    if (!isCreateDialogOpen || selectedOwnerId || !sessionOwnerId) {
      return
    }

    setSelectedOwnerId(sessionOwnerId)
  }, [isCreateDialogOpen, selectedOwnerId, sessionOwnerId])

  const selectedOwner =
    ownerCandidates.data?.find((candidate) => candidate.id === selectedOwnerId) ??
    (selectedOwnerId === sessionOwnerId && session
      ? {
          email: session.user.email,
          id: session.user.id,
          name: session.user.name,
          username: session.user.username,
        }
      : null)

  function handleCreateDialogOpenChange(isOpen: boolean) {
    setIsCreateDialogOpen(isOpen)
    setOwnerSearch('')
    setSelectedOwnerId(sessionOwnerId)
  }

  function handleCreateOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedOwnerId) {
      toast.error('Select an owner before creating the community.')
      return
    }

    createMutation.mutate({
      logo: createValues.logo || undefined,
      name: createValues.name,
      ownerUserId: selectedOwnerId,
      slug: createValues.slug,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-medium">Communities</h2>
          <p className="text-muted-foreground text-sm">Manage communities, ownership, and membership from one place.</p>
        </div>
        <Dialog onOpenChange={handleCreateDialogOpenChange} open={isCreateDialogOpen}>
          <DialogTrigger render={<Button data-icon="inline-start" />}>
            <Plus />
            Create Community
          </DialogTrigger>
          <DialogContent>
            <form className="space-y-4" onSubmit={handleCreateOrganization}>
              <DialogHeader>
                <DialogTitle>Create Community</DialogTitle>
                <DialogDescription>
                  Pick an existing user as the initial owner, then create the community with core defaults.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <label className="text-sm" htmlFor="organization-name">
                    Name
                  </label>
                  <Input
                    id="organization-name"
                    onBlur={() =>
                      setCreateValues((currentValues) => {
                        if (currentValues.slug.trim()) {
                          return currentValues
                        }

                        return {
                          ...currentValues,
                          slug: slugify(currentValues.name),
                        }
                      })
                    }
                    onChange={(event) =>
                      setCreateValues((currentValues) => ({
                        ...currentValues,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Acme Studios"
                    required
                    value={createValues.name}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-sm" htmlFor="organization-slug">
                    Slug
                  </label>
                  <Input
                    id="organization-slug"
                    onChange={(event) =>
                      setCreateValues((currentValues) => ({
                        ...currentValues,
                        slug: event.target.value,
                      }))
                    }
                    placeholder="acme-studios"
                    required
                    value={createValues.slug}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-sm" htmlFor="organization-logo">
                    Logo URL
                  </label>
                  <Input
                    id="organization-logo"
                    onChange={(event) =>
                      setCreateValues((currentValues) => ({
                        ...currentValues,
                        logo: event.target.value,
                      }))
                    }
                    placeholder="https://example.com/logo.png"
                    value={createValues.logo}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-sm" htmlFor="owner-search">
                    Owner
                  </label>
                  <Input
                    id="owner-search"
                    onChange={(event) => setOwnerSearch(event.target.value)}
                    placeholder="Search by name, username, or email"
                    value={ownerSearch}
                  />
                  <div className="border">
                    {ownerCandidates.isPending ? (
                      <div className="text-muted-foreground flex items-center gap-2 px-3 py-4 text-sm">
                        <Loader2 className="size-4 animate-spin" />
                        Loading users
                      </div>
                    ) : ownerCandidates.data?.length ? (
                      <div className="max-h-56 overflow-y-auto">
                        {ownerCandidates.data.map((candidate) => {
                          const isSelected = candidate.id === selectedOwnerId

                          return (
                            <button
                              className={cn(
                                'hover:bg-muted/50 flex w-full flex-col gap-1 border-b px-3 py-2 text-left transition-colors last:border-b-0',
                                isSelected ? 'bg-muted' : undefined,
                              )}
                              key={candidate.id}
                              onClick={() => setSelectedOwnerId(candidate.id)}
                              type="button"
                            >
                              <span className="text-sm">{candidate.name}</span>
                              {candidate.username ? (
                                <span className="text-muted-foreground text-xs">@{candidate.username}</span>
                              ) : null}
                              <span className="text-muted-foreground text-xs">{candidate.email}</span>
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-muted-foreground px-3 py-4 text-sm">No matching users found.</div>
                    )}
                  </div>
                  {selectedOwner ? (
                    <p className="text-muted-foreground text-xs">
                      Selected owner:{' '}
                      {selectedOwner.username
                        ? `${selectedOwner.name} (@${selectedOwner.username})`
                        : selectedOwner.name}
                    </p>
                  ) : null}
                </div>
              </div>
              <DialogFooter className="border-t pt-3">
                <Button onClick={() => setIsCreateDialogOpen(false)} type="button" variant="outline">
                  Cancel
                </Button>
                <Button disabled={createMutation.isPending} type="submit">
                  {createMutation.isPending ? (
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
      </div>

      <div className="max-w-md">
        <Input
          onChange={(event) => setOrganizationSearch(event.target.value)}
          placeholder="Search by name or slug"
          value={organizationSearch}
        />
      </div>

      {organizations.isPending ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading communities
        </div>
      ) : organizations.data?.organizations.length ? (
        <div className="grid gap-4">
          {organizations.data.organizations.map((organization) => {
            return (
              <Card key={organization.id}>
                <CardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <CardTitle>
                        <Link
                          className="hover:text-primary transition-colors"
                          params={{
                            organizationId: organization.id,
                          }}
                          to="/admin/communities/$organizationId"
                        >
                          {organization.name}
                        </Link>
                      </CardTitle>
                      <CardDescription>{organization.slug}</CardDescription>
                    </div>
                    <Link
                      params={{
                        organizationId: organization.id,
                      }}
                      to="/admin/communities/$organizationId"
                    >
                      <Button variant="outline">Manage</Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm">
                  <div className="flex flex-col gap-1 md:flex-row md:gap-2">
                    <span className="text-muted-foreground">Owners:</span>
                    <span>
                      {organization.owners.length
                        ? organization.owners.map(formatOwnerSummary).join(', ')
                        : 'No owners found'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 md:flex-row md:gap-2">
                    <span className="text-muted-foreground">Members:</span>
                    <span>{organization.memberCount}</span>
                  </div>
                  <div className="flex flex-col gap-1 md:flex-row md:gap-2">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{formatDate(organization.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Communities</CardTitle>
            <CardDescription>Create the first community from this admin section.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
