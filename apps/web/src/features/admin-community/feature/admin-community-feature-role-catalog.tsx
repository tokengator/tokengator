import { Loader2, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@tokengator/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@tokengator/ui/components/dialog'

import { useAdminAssetGroupListQuery } from '@/features/admin-asset/data-access/use-admin-asset-group-list-query'

import type { AdminCommunityMembershipSyncResult } from '../data-access/admin-community-role-types'
import { useAdminCommunityDiscordGuildRolesQuery } from '../data-access/use-admin-community-discord-guild-roles-query'
import { useAdminCommunityRoleCreate } from '../data-access/use-admin-community-role-create'
import { useAdminCommunityRoleDelete } from '../data-access/use-admin-community-role-delete'
import { useAdminCommunityRoleListQuery } from '../data-access/use-admin-community-role-list-query'
import { useAdminCommunityRoleUpdate } from '../data-access/use-admin-community-role-update'
import { AdminCommunityRoleUiDeleteDialog } from '../ui/admin-community-role-ui-delete-dialog'
import {
  AdminCommunityRoleUiForm,
  getAdminCommunityRoleUiDefaultValues,
  type AdminCommunityRoleUiFormSubmitValues,
} from '../ui/admin-community-role-ui-form'
import { AdminCommunityFeatureRoleMappingCard } from './admin-community-feature-role-mapping-card'

interface AdminCommunityFeatureRoleCatalogProps {
  membershipSyncResult: AdminCommunityMembershipSyncResult | null
  onDiscordSyncResultReset: () => void
  onMembershipSyncResultReset: () => void
  organizationId: string
}

export function AdminCommunityFeatureRoleCatalog(props: AdminCommunityFeatureRoleCatalogProps) {
  const { membershipSyncResult, onDiscordSyncResultReset, onMembershipSyncResultReset, organizationId } = props
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deletePendingRole, setDeletePendingRole] = useState<{ id: string; name: string } | null>(null)
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const assetGroups = useAdminAssetGroupListQuery({
    limit: 100,
  })
  const discordGuildRolesQuery = useAdminCommunityDiscordGuildRolesQuery(organizationId)
  const communityRolesQuery = useAdminCommunityRoleListQuery(organizationId)
  const createCommunityRole = useAdminCommunityRoleCreate(organizationId)
  const deleteCommunityRole = useAdminCommunityRoleDelete(organizationId)
  const updateCommunityRole = useAdminCommunityRoleUpdate(organizationId)
  const communityRoles = communityRolesQuery.data?.communityRoles ?? []
  const discordGuildRoles = discordGuildRolesQuery.data
  const errorMessage = communityRolesQuery.error?.message ?? null
  const assetGroupOptions =
    assetGroups.data?.assetGroups.map((assetGroup) => ({
      enabled: assetGroup.enabled,
      id: assetGroup.id,
      label: assetGroup.label,
      type: assetGroup.type,
    })) ?? []
  const editingRole = communityRoles.find((communityRole) => communityRole.id === editingRoleId) ?? null

  function resetPreviewState() {
    onDiscordSyncResultReset()
    onMembershipSyncResultReset()
  }

  async function handleCreateRole(values: AdminCommunityRoleUiFormSubmitValues) {
    try {
      await createCommunityRole.mutateAsync({
        data: values,
        organizationId,
      })
      setCreateDialogOpen(false)
      resetPreviewState()
    } catch {}
  }

  async function handleDeleteRole() {
    if (!deletePendingRole) {
      return
    }

    try {
      await deleteCommunityRole.mutateAsync({
        communityRoleId: deletePendingRole.id,
      })
      setDeletePendingRole(null)
      resetPreviewState()
    } catch {}
  }

  async function handleUpdateRole(values: AdminCommunityRoleUiFormSubmitValues) {
    if (!editingRole) {
      return
    }

    try {
      await updateCommunityRole.mutateAsync({
        communityRoleId: editingRole.id,
        data: values,
      })
      setEditingRoleId(null)
      resetPreviewState()
    } catch {}
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle>Roles</CardTitle>
            <CardDescription>Map asset groups to Better Auth teams for this community.</CardDescription>
          </div>
          <Dialog onOpenChange={setCreateDialogOpen} open={createDialogOpen}>
            <DialogTrigger render={<Button data-icon="inline-start" />}>
              <Plus className="size-4" />
              Create Role
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Role</DialogTitle>
                <DialogDescription>
                  Define the asset conditions that add users to this community team.
                </DialogDescription>
              </DialogHeader>
              <AdminCommunityRoleUiForm
                assetGroupOptions={assetGroupOptions}
                initialValues={getAdminCommunityRoleUiDefaultValues()}
                isPending={createCommunityRole.isPending}
                key={createDialogOpen ? 'create-open' : 'create-closed'}
                onSubmit={(values) => void handleCreateRole(values)}
                submitLabel="Create Role"
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {assetGroups.isPending || communityRolesQuery.isPending ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading community roles...
            </div>
          ) : null}
          {errorMessage ? <div className="text-destructive text-sm">{errorMessage}</div> : null}
          {!communityRolesQuery.isPending && !communityRoles.length ? (
            <p className="text-muted-foreground text-sm">No token-gated roles yet.</p>
          ) : null}
          {communityRoles.map((communityRole) => {
            const previewRole = membershipSyncResult?.roles.find((role) => role.id === communityRole.id)

            return (
              <AdminCommunityFeatureRoleMappingCard
                communityRole={communityRole}
                communityRoles={communityRoles}
                discordGuildRoles={discordGuildRoles}
                hasDiscordGuildRolesError={Boolean(discordGuildRolesQuery.error)}
                isDiscordGuildRolesPending={discordGuildRolesQuery.isPending}
                key={communityRole.id}
                onDelete={() =>
                  setDeletePendingRole({
                    id: communityRole.id,
                    name: communityRole.name,
                  })
                }
                onDiscordSyncResultReset={onDiscordSyncResultReset}
                onEdit={() => setEditingRoleId(communityRole.id)}
                organizationId={organizationId}
                previewAddCount={previewRole?.addCount ?? 0}
                previewRemoveCount={previewRole?.removeCount ?? 0}
              />
            )
          })}
        </CardContent>
      </Card>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setEditingRoleId(null)
          }
        }}
        open={Boolean(editingRole)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>Update the team-backed gating conditions for this role.</DialogDescription>
          </DialogHeader>
          {editingRole ? (
            <AdminCommunityRoleUiForm
              assetGroupOptions={assetGroupOptions}
              initialValues={{
                conditions: editingRole.conditions.map((condition) => ({
                  assetGroupId: condition.assetGroupId,
                  maximumAmount: condition.maximumAmount ?? '',
                  minimumAmount: condition.minimumAmount,
                })),
                enabled: editingRole.enabled,
                matchMode: editingRole.matchMode,
                name: editingRole.name,
                slug: editingRole.slug,
              }}
              isPending={updateCommunityRole.isPending}
              key={editingRole.id}
              onSubmit={(values) => void handleUpdateRole(values)}
              submitLabel="Save Changes"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AdminCommunityRoleUiDeleteDialog
        isPending={deleteCommunityRole.isPending}
        onConfirm={() => void handleDeleteRole()}
        onOpenChange={(open) => {
          if (!open) {
            setDeletePendingRole(null)
          }
        }}
        open={Boolean(deletePendingRole)}
        roleName={deletePendingRole?.name ?? null}
      />
    </>
  )
}
