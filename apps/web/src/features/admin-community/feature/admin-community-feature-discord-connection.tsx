import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

import type { AdminCommunityGetResult } from '../data-access/use-admin-community-get-query'
import { useAdminCommunityDiscordConnectionDelete } from '../data-access/use-admin-community-discord-connection-delete'
import { useAdminCommunityDiscordConnectionRefresh } from '../data-access/use-admin-community-discord-connection-refresh'
import { useAdminCommunityDiscordConnectionUpsert } from '../data-access/use-admin-community-discord-connection-upsert'
import { AdminCommunityDiscordConnectionUiDeleteDialog } from '../ui/admin-community-discord-connection-ui-delete-dialog'
import { AdminCommunityDiscordConnectionUiDetails } from '../ui/admin-community-discord-connection-ui-details'
import { AdminCommunityDiscordConnectionUiForm } from '../ui/admin-community-discord-connection-ui-form'
import { formatAdminCommunityDiscordCheck } from '../util/admin-community-discord-check'

export function AdminCommunityFeatureDiscordConnection({ organization }: { organization: AdminCommunityGetResult }) {
  const discordConnection = organization.discordConnection
  const deleteDiscordConnection = useAdminCommunityDiscordConnectionDelete(organization.id)
  const refreshDiscordConnection = useAdminCommunityDiscordConnectionRefresh(organization.id)
  const upsertDiscordConnection = useAdminCommunityDiscordConnectionUpsert(organization.id)

  async function handleDeleteDiscordConnection() {
    try {
      await deleteDiscordConnection.mutateAsync({
        organizationId: organization.id,
      })

      return true
    } catch {
      return false
    }
  }

  function handleInvite() {
    if (!discordConnection) {
      return
    }

    window.open(discordConnection.inviteUrl, '_blank', 'noopener,noreferrer')
  }

  function handleRefreshDiscordConnection() {
    refreshDiscordConnection.mutate({
      organizationId: organization.id,
    })
  }

  async function handleSaveDiscordConnection(guildId: string) {
    try {
      await upsertDiscordConnection.mutateAsync({
        guildId: guildId.trim(),
        organizationId: organization.id,
      })

      return true
    } catch {
      return false
    }
  }

  const diagnostics = discordConnection?.diagnostics?.checks?.map((check) => formatAdminCommunityDiscordCheck(check))
  const disconnectAction: ReactNode = (
    <AdminCommunityDiscordConnectionUiDeleteDialog
      isPending={deleteDiscordConnection.isPending}
      onConfirm={handleDeleteDiscordConnection}
    />
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discord Server</CardTitle>
        <CardDescription>Connect this community to exactly one Discord server.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {discordConnection ? (
          <AdminCommunityDiscordConnectionUiDetails
            diagnostics={diagnostics}
            disconnectAction={disconnectAction}
            discordConnection={discordConnection}
            isRefreshPending={refreshDiscordConnection.isPending}
            onInvite={handleInvite}
            onRefresh={handleRefreshDiscordConnection}
          />
        ) : (
          <AdminCommunityDiscordConnectionUiForm
            initialGuildId=""
            isPending={upsertDiscordConnection.isPending}
            onSubmit={handleSaveDiscordConnection}
          />
        )}
      </CardContent>
    </Card>
  )
}
