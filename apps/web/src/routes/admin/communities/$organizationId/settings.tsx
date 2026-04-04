import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { UiDetailRow } from '@tokengator/ui/components/ui-detail-row'
import { UiStatus, type UiStatusVariants } from '@tokengator/ui/components/ui-status'

import { useAdminCommunityGetQuery } from '@/features/admin-community/data-access/use-admin-community-get-query'
import { orpc } from '@/utils/orpc'

const discordCheckLabels: Record<string, string> = {
  bot_identity_lookup_failed: 'TokenGator could not identify the Discord bot account.',
  bot_not_in_guild: 'The Discord bot is not a member of this server yet.',
  bot_token_missing: 'The Discord bot token is not configured for the API environment.',
  commands_registration_failed: 'Guild slash command registration failed for this server.',
  guild_fetch_failed: 'TokenGator could not load the Discord server details.',
  guild_not_found: 'The Discord server could not be found from the configured guild ID.',
  manage_roles_missing: 'The Discord bot is missing the Manage Roles permission.',
}

function formatDiscordCheck(check: string) {
  return discordCheckLabels[check] ?? check.replaceAll('_', ' ')
}

function formatLastCheckedAt(value: Date | string | null) {
  if (!value) {
    return 'Never'
  }

  return new Date(value).toLocaleString()
}

export const Route = createFileRoute('/admin/communities/$organizationId/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { organizationId } = Route.useParams()
  const [discordGuildId, setDiscordGuildId] = useState('')
  const [isDeleteDiscordDialogOpen, setIsDeleteDiscordDialogOpen] = useState(false)
  const [formValues, setFormValues] = useState({
    logo: '',
    name: '',
    slug: '',
  })
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const organization = useAdminCommunityGetQuery(organizationId)
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
  const deleteDiscordConnectionMutation = useMutation(
    orpc.adminOrganization.deleteDiscordConnection.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.adminOrganization.get.key({
            input: {
              organizationId,
            },
          }),
        })
        setDiscordGuildId('')
        setIsDeleteDiscordDialogOpen(false)
        toast.success('Discord server disconnected.')
      },
    }),
  )
  const refreshDiscordConnectionMutation = useMutation(
    orpc.adminOrganization.refreshDiscordConnection.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.adminOrganization.get.key({
            input: {
              organizationId,
            },
          }),
        })
        toast.success('Discord server status refreshed.')
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
  const upsertDiscordConnectionMutation = useMutation(
    orpc.adminOrganization.upsertDiscordConnection.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async (connection) => {
        await queryClient.invalidateQueries({
          queryKey: orpc.adminOrganization.get.key({
            input: {
              organizationId,
            },
          }),
        })
        setDiscordGuildId(connection.guildId)
        toast.success('Discord server saved.')
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
    setDiscordGuildId(organization.data.discordConnection?.guildId ?? '')
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

  function handleDeleteDiscordConnection() {
    deleteDiscordConnectionMutation.mutate({
      organizationId,
    })
  }

  function handleRefreshDiscordConnection() {
    refreshDiscordConnectionMutation.mutate({
      organizationId,
    })
  }

  function handleSaveDiscordConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    upsertDiscordConnectionMutation.mutate({
      guildId: discordGuildId.trim(),
      organizationId,
    })
  }

  if (!organization.data) {
    return null
  }

  const discordConnection = organization.data.discordConnection
  const discordChecks = discordConnection?.diagnostics?.checks ?? []
  const discordStatusTone: UiStatusVariants['tone'] = discordConnection?.status === 'connected' ? 'success' : 'warning'

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
          <CardTitle>Discord Server</CardTitle>
          <CardDescription>Connect this community to exactly one Discord server.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!discordConnection ? (
            <form className="flex flex-col gap-4" onSubmit={handleSaveDiscordConnection}>
              <div className="grid gap-1.5">
                <label className="text-sm" htmlFor="organization-discord-guild-id">
                  Server ID
                </label>
                <Input
                  id="organization-discord-guild-id"
                  inputMode="numeric"
                  onChange={(event) => setDiscordGuildId(event.target.value)}
                  placeholder="123456789012345678"
                  required
                  value={discordGuildId}
                />
                <p className="text-muted-foreground text-xs">
                  Copy the Discord server ID from Developer Mode, then save it here before inviting the bot.
                </p>
              </div>
              <div className="flex justify-end">
                <Button disabled={upsertDiscordConnectionMutation.isPending || !discordGuildId.trim()} type="submit">
                  {upsertDiscordConnectionMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving
                    </>
                  ) : (
                    'Save Server'
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <>
              <div className="grid gap-2 text-sm">
                <UiDetailRow label="Server ID:">{discordConnection.guildId}</UiDetailRow>
                <UiDetailRow label="Server Name:">{discordConnection.guildName ?? 'Unknown'}</UiDetailRow>
                <UiDetailRow align="center" label="Status:">
                  <UiStatus tone={discordStatusTone}>
                    {discordConnection.status === 'connected' ? 'Connected' : 'Needs attention'}
                  </UiStatus>
                </UiDetailRow>
                <UiDetailRow label="Last checked:">{formatLastCheckedAt(discordConnection.lastCheckedAt)}</UiDetailRow>
                <UiDetailRow label="Manage Roles:">
                  {discordConnection.diagnostics?.permissions.manageRoles ? 'Granted' : 'Missing'}
                </UiDetailRow>
                <UiDetailRow label="Commands:">
                  {discordConnection.diagnostics?.commands.registered ? 'Registered' : 'Not registered'}
                </UiDetailRow>
                {discordConnection.diagnostics?.commands.errorMessage ? (
                  <UiDetailRow label="Command error:">
                    {discordConnection.diagnostics.commands.errorMessage}
                  </UiDetailRow>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => window.open(discordConnection.inviteUrl, '_blank', 'noopener,noreferrer')}
                  type="button"
                  variant="outline"
                >
                  Invite Bot
                </Button>
                <Button
                  disabled={refreshDiscordConnectionMutation.isPending}
                  onClick={handleRefreshDiscordConnection}
                  type="button"
                  variant="outline"
                >
                  {refreshDiscordConnectionMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Refreshing
                    </>
                  ) : (
                    'Refresh Check'
                  )}
                </Button>
                <Button onClick={() => setIsDeleteDiscordDialogOpen(true)} type="button" variant="destructive">
                  Disconnect
                </Button>
              </div>
              <div className="grid gap-2 rounded-lg border p-3">
                <div className="text-sm font-medium">Diagnostics</div>
                {discordChecks.length ? (
                  <ol className="list-decimal space-y-1 pl-5 text-sm">
                    {discordChecks.map((check: string) => (
                      <li key={check}>{formatDiscordCheck(check)}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Ready. Bot membership, permissions, and command registration passed.
                  </p>
                )}
              </div>
            </>
          )}
          <Dialog onOpenChange={setIsDeleteDiscordDialogOpen} open={isDeleteDiscordDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Disconnect Discord Server</DialogTitle>
                <DialogDescription>Remove this community’s saved Discord server connection?</DialogDescription>
              </DialogHeader>
              <DialogFooter className="border-t pt-3">
                <Button onClick={() => setIsDeleteDiscordDialogOpen(false)} type="button" variant="outline">
                  Cancel
                </Button>
                <Button
                  disabled={deleteDiscordConnectionMutation.isPending}
                  onClick={handleDeleteDiscordConnection}
                  type="button"
                  variant="destructive"
                >
                  {deleteDiscordConnectionMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Disconnecting
                    </>
                  ) : (
                    'Disconnect'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
