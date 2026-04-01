import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Loader2, PencilLine, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@tokengator/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { Checkbox } from '@tokengator/ui/components/checkbox'
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

import { orpc } from '@/utils/orpc'

import { getAdminOrganizationQueryOptions } from './route'

type AssetGroupOption = {
  address: string
  enabled: boolean
  id: string
  label: string
  type: 'collection' | 'mint'
}

type CommunityRoleFormValues = {
  conditions: Array<{
    assetGroupId: string
    maximumAmount: string
    minimumAmount: string
  }>
  enabled: boolean
  matchMode: 'all' | 'any'
  name: string
  slug: string
}

type CommunityRoleSubmitValues = {
  conditions: Array<{
    assetGroupId: string
    maximumAmount: string | null
    minimumAmount: string
  }>
  enabled: boolean
  matchMode: 'all' | 'any'
  name: string
  slug: string
}

function isPositiveInteger(value: string) {
  return /^[1-9]\d*$/.test(value)
}

function hasValidConditionRange(condition: CommunityRoleFormValues['conditions'][number]) {
  if (!condition.assetGroupId || !isPositiveInteger(condition.minimumAmount)) {
    return false
  }

  if (!condition.maximumAmount) {
    return true
  }

  return (
    isPositiveInteger(condition.maximumAmount) && BigInt(condition.maximumAmount) >= BigInt(condition.minimumAmount)
  )
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

function defaultRoleValues(): CommunityRoleFormValues {
  return {
    conditions: [
      {
        assetGroupId: '',
        maximumAmount: '',
        minimumAmount: '1',
      },
    ],
    enabled: true,
    matchMode: 'any',
    name: '',
    slug: '',
  }
}

function CommunityRoleForm(props: {
  assetGroupOptions: AssetGroupOption[]
  initialValues: CommunityRoleFormValues
  isPending: boolean
  onSubmit: (values: CommunityRoleSubmitValues) => void
  submitLabel: string
}) {
  const { assetGroupOptions, initialValues, isPending, onSubmit, submitLabel } = props
  const [values, setValues] = useState(initialValues)

  useEffect(() => {
    setValues(initialValues)
  }, [initialValues])

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()

        onSubmit({
          ...values,
          conditions: values.conditions
            .map((condition) => ({
              assetGroupId: condition.assetGroupId,
              maximumAmount: condition.maximumAmount.trim() || null,
              minimumAmount: condition.minimumAmount.trim() || '1',
            }))
            .filter((condition) => condition.assetGroupId),
          name: values.name.trim(),
          slug: values.slug.trim() || slugify(values.name),
        })
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="community-role-name">Name</Label>
        <Input
          id="community-role-name"
          onBlur={() =>
            setValues((currentValues) => {
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
            setValues((currentValues) => ({
              ...currentValues,
              name: event.target.value,
            }))
          }
          placeholder="Collectors"
          required
          value={values.name}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="community-role-slug">Slug</Label>
        <Input
          id="community-role-slug"
          onChange={(event) =>
            setValues((currentValues) => ({
              ...currentValues,
              slug: event.target.value,
            }))
          }
          placeholder="collectors"
          required
          value={values.slug}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="community-role-match-mode">Match Mode</Label>
        <select
          className="bg-background border px-2 py-1 text-sm"
          id="community-role-match-mode"
          onChange={(event) =>
            setValues((currentValues) => ({
              ...currentValues,
              matchMode: event.target.value as CommunityRoleFormValues['matchMode'],
            }))
          }
          value={values.matchMode}
        >
          <option value="all">ALL</option>
          <option value="any">ANY</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={values.enabled}
          id="community-role-enabled"
          onCheckedChange={(checked) =>
            setValues((currentValues) => ({
              ...currentValues,
              enabled: Boolean(checked),
            }))
          }
        />
        <Label htmlFor="community-role-enabled">Enabled</Label>
      </div>
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <Label>Conditions</Label>
          <Button
            onClick={() =>
              setValues((currentValues) => ({
                ...currentValues,
                conditions: [
                  ...currentValues.conditions,
                  {
                    assetGroupId: '',
                    maximumAmount: '',
                    minimumAmount: '1',
                  },
                ],
              }))
            }
            type="button"
            variant="outline"
          >
            Add Condition
          </Button>
        </div>
        {values.conditions.map((condition, conditionIndex) => (
          <div className="grid gap-3 border p-3" key={`${condition.assetGroupId}-${conditionIndex}`}>
            <div className="grid gap-1.5">
              <Label htmlFor={`community-role-condition-asset-group-${conditionIndex}`}>Asset Group</Label>
              <select
                className="bg-background border px-2 py-1 text-sm"
                id={`community-role-condition-asset-group-${conditionIndex}`}
                onChange={(event) =>
                  setValues((currentValues) => ({
                    ...currentValues,
                    conditions: currentValues.conditions.map((currentCondition, currentConditionIndex) =>
                      currentConditionIndex === conditionIndex
                        ? {
                            ...currentCondition,
                            assetGroupId: event.target.value,
                          }
                        : currentCondition,
                    ),
                  }))
                }
                required
                value={condition.assetGroupId}
              >
                <option value="">Select an asset group</option>
                {assetGroupOptions.map((assetGroup) => (
                  <option key={assetGroup.id} value={assetGroup.id}>
                    {`${assetGroup.label} (${assetGroup.type}${assetGroup.enabled ? '' : ', disabled'})`}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`community-role-condition-minimum-amount-${conditionIndex}`}>Minimum Amount</Label>
              <Input
                id={`community-role-condition-minimum-amount-${conditionIndex}`}
                inputMode="numeric"
                onChange={(event) =>
                  setValues((currentValues) => ({
                    ...currentValues,
                    conditions: currentValues.conditions.map((currentCondition, currentConditionIndex) =>
                      currentConditionIndex === conditionIndex
                        ? {
                            ...currentCondition,
                            minimumAmount: event.target.value.replace(/[^0-9]/g, ''),
                          }
                        : currentCondition,
                    ),
                  }))
                }
                placeholder="1"
                required
                value={condition.minimumAmount}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`community-role-condition-maximum-amount-${conditionIndex}`}>Maximum Amount</Label>
              <Input
                id={`community-role-condition-maximum-amount-${conditionIndex}`}
                inputMode="numeric"
                onChange={(event) =>
                  setValues((currentValues) => ({
                    ...currentValues,
                    conditions: currentValues.conditions.map((currentCondition, currentConditionIndex) =>
                      currentConditionIndex === conditionIndex
                        ? {
                            ...currentCondition,
                            maximumAmount: event.target.value.replace(/[^0-9]/g, ''),
                          }
                        : currentCondition,
                    ),
                  }))
                }
                placeholder="Optional"
                value={condition.maximumAmount}
              />
            </div>
            {condition.maximumAmount && !hasValidConditionRange(condition) ? (
              <div className="text-destructive text-xs">
                Maximum amount must be greater than or equal to minimum amount.
              </div>
            ) : null}
            <div className="flex justify-end">
              <Button
                disabled={values.conditions.length === 1}
                onClick={() =>
                  setValues((currentValues) => ({
                    ...currentValues,
                    conditions: currentValues.conditions.filter(
                      (_, currentConditionIndex) => currentConditionIndex !== conditionIndex,
                    ),
                  }))
                }
                type="button"
                variant="outline"
              >
                Remove Condition
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button
          disabled={isPending || !values.name.trim() || !values.conditions.every(hasValidConditionRange)}
          type="submit"
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  )
}

export const Route = createFileRoute('/admin/communities/$organizationId/roles')({
  component: RouteComponent,
})

function RouteComponent() {
  const queryClient = useQueryClient()
  const { organizationId } = Route.useParams()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deletePendingRole, setDeletePendingRole] = useState<{ id: string; name: string } | null>(null)
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<Awaited<
    ReturnType<typeof orpc.adminCommunityRole.previewSync.call>
  > | null>(null)
  const organization = useQuery(getAdminOrganizationQueryOptions(organizationId))
  const assetGroups = useQuery(
    orpc.adminAssetGroup.list.queryOptions({
      input: {
        limit: 100,
      },
    }),
  )
  const communityRoles = useQuery(
    orpc.adminCommunityRole.list.queryOptions({
      input: {
        organizationId,
      },
    }),
  )
  const createCommunityRoleMutation = useMutation(
    orpc.adminCommunityRole.create.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.adminCommunityRole.list.key({
            input: {
              organizationId,
            },
          }),
        })
        setCreateDialogOpen(false)
        setSyncResult(null)
        toast.success('Community role created.')
      },
    }),
  )
  const deleteCommunityRoleMutation = useMutation(
    orpc.adminCommunityRole.delete.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.adminCommunityRole.list.key({
            input: {
              organizationId,
            },
          }),
        })
        await queryClient.invalidateQueries({
          queryKey: orpc.adminOrganization.get.key({
            input: {
              organizationId,
            },
          }),
        })
        await queryClient.invalidateQueries({
          queryKey: orpc.organization.listMine.key(),
        })
        setDeletePendingRole(null)
        setSyncResult(null)
        toast.success('Community role deleted.')
      },
    }),
  )
  const previewSyncMutation = useMutation(
    orpc.adminCommunityRole.previewSync.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: (result) => {
        setSyncResult(result)
        toast.success('Access preview updated.')
      },
    }),
  )
  const applySyncMutation = useMutation(
    orpc.adminCommunityRole.applySync.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async (result) => {
        setSyncResult(result)
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: orpc.adminCommunityRole.list.key({
              input: {
                organizationId,
              },
            }),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.adminOrganization.get.key({
              input: {
                organizationId,
              },
            }),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.organization.listMine.key(),
          }),
        ])
        toast.success('Access sync applied.')
      },
    }),
  )
  const updateCommunityRoleMutation = useMutation(
    orpc.adminCommunityRole.update.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.adminCommunityRole.list.key({
            input: {
              organizationId,
            },
          }),
        })
        setEditingRoleId(null)
        setSyncResult(null)
        toast.success('Community role updated.')
      },
    }),
  )
  const assetGroupOptions = assetGroups.data?.assetGroups ?? []
  const editingRole =
    communityRoles.data?.communityRoles.find((communityRole) => communityRole.id === editingRoleId) ?? null

  if (!organization.data) {
    return null
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Access Sync</CardTitle>
          <CardDescription>
            Preview and apply the current token-gated organization and team membership changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={previewSyncMutation.isPending}
              onClick={() =>
                previewSyncMutation.mutate({
                  organizationId,
                })
              }
              type="button"
              variant="outline"
            >
              {previewSyncMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Preview Access
            </Button>
            <Button
              disabled={applySyncMutation.isPending}
              onClick={() =>
                applySyncMutation.mutate({
                  organizationId,
                })
              }
              type="button"
            >
              {applySyncMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Apply Access
            </Button>
          </div>
          {syncResult ? (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border p-3 text-sm">
                <div className="text-muted-foreground">Organization Changes</div>
                <div>Add: {syncResult.summary.addToOrganizationCount}</div>
                <div>Remove: {syncResult.summary.removeFromOrganizationCount}</div>
              </div>
              <div className="rounded-lg border p-3 text-sm">
                <div className="text-muted-foreground">Team Changes</div>
                <div>Add: {syncResult.summary.addToTeamCount}</div>
                <div>Remove: {syncResult.summary.removeFromTeamCount}</div>
              </div>
              <div className="rounded-lg border p-3 text-sm">
                <div className="text-muted-foreground">Users</div>
                <div>Qualified: {syncResult.summary.qualifiedUserCount}</div>
                <div>Changed: {syncResult.summary.usersChangedCount}</div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Run a preview to inspect the next membership diff.</p>
          )}
        </CardContent>
      </Card>

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
              <CommunityRoleForm
                assetGroupOptions={assetGroupOptions}
                initialValues={defaultRoleValues()}
                isPending={createCommunityRoleMutation.isPending}
                onSubmit={(values) =>
                  createCommunityRoleMutation.mutate({
                    data: values,
                    organizationId,
                  })
                }
                submitLabel="Create Role"
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {assetGroups.isPending || communityRoles.isPending ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading community roles...
            </div>
          ) : null}
          {communityRoles.error ? <div className="text-destructive text-sm">{communityRoles.error.message}</div> : null}
          {!communityRoles.isPending && !communityRoles.data?.communityRoles.length ? (
            <p className="text-muted-foreground text-sm">No token-gated roles yet.</p>
          ) : null}
          {communityRoles.data?.communityRoles.map((communityRole) => {
            const previewRole = syncResult?.roles.find((role) => role.id === communityRole.id)

            return (
              <Card key={communityRole.id}>
                <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{communityRole.name}</CardTitle>
                    <CardDescription>
                      Team: {communityRole.teamName} · Slug: {communityRole.slug} · Match:{' '}
                      {communityRole.matchMode.toUpperCase()} · {communityRole.enabled ? 'enabled' : 'disabled'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setEditingRoleId(communityRole.id)} type="button" variant="outline">
                      <PencilLine className="size-4" />
                      Edit
                    </Button>
                    <Button
                      onClick={() =>
                        setDeletePendingRole({
                          id: communityRole.id,
                          name: communityRole.name,
                        })
                      }
                      type="button"
                      variant="outline"
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-sm">
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <div className="text-muted-foreground">Current Team Members</div>
                      <div>{communityRole.teamMemberCount}</div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-muted-foreground">Preview Diff</div>
                      <div>
                        +{previewRole?.addCount ?? 0} / -{previewRole?.removeCount ?? 0}
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    {communityRole.conditions.map((condition) => (
                      <div className="rounded-lg border p-3" key={condition.id}>
                        <div className="font-medium">{condition.assetGroupLabel}</div>
                        <div className="text-muted-foreground">
                          {condition.assetGroupType} · {condition.assetGroupAddress}
                        </div>
                        <div>
                          Amount range: {condition.minimumAmount}
                          {condition.maximumAmount ? ` to ${condition.maximumAmount}` : '+'}
                        </div>
                        {!condition.assetGroupEnabled ? (
                          <div className="text-destructive text-xs">
                            This asset group is disabled and will not qualify users.
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </CardContent>
      </Card>

      {syncResult ? (
        <Card>
          <CardHeader>
            <CardTitle>Preview Details</CardTitle>
            <CardDescription>Inspect who will gain or lose organization membership and gated roles.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {!syncResult.users.length ? (
              <p className="text-muted-foreground text-sm">No current or pending gated members.</p>
            ) : null}
            {syncResult.users.map((currentUser) => (
              <div className="grid gap-2 rounded-lg border p-3 text-sm" key={currentUser.userId}>
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-medium">{currentUser.name}</div>
                    <div className="text-muted-foreground">
                      {currentUser.username ? `@${currentUser.username}` : 'No username'} ·{' '}
                      {currentUser.wallets.length ? currentUser.wallets.join(', ') : 'No linked wallets'}
                    </div>
                  </div>
                  <div className="text-muted-foreground">
                    Org role: {currentUser.currentOrganizationRole ?? 'none'}
                    {currentUser.managedMembership ? ' · managed' : ''}
                  </div>
                </div>
                <div>
                  Current gated roles:{' '}
                  {currentUser.currentGatedRoles.length
                    ? currentUser.currentGatedRoles.map((role) => role.name).join(', ')
                    : 'none'}
                </div>
                <div>
                  Next gated roles:{' '}
                  {currentUser.nextGatedRoles.length
                    ? currentUser.nextGatedRoles.map((role) => role.name).join(', ')
                    : 'none'}
                </div>
                <div>
                  Team diff: +
                  {currentUser.addToTeams.length ? currentUser.addToTeams.map((role) => role.name).join(', ') : 'none'}{' '}
                  / -
                  {currentUser.removeFromTeams.length
                    ? currentUser.removeFromTeams.map((role) => role.name).join(', ')
                    : 'none'}
                </div>
                <div>
                  Organization diff: {currentUser.addToOrganization ? 'add' : 'keep'}
                  {currentUser.removeFromOrganization ? ' / remove' : ''}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Dialog
        onOpenChange={(isOpen) => {
          if (!isOpen) {
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
            <CommunityRoleForm
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
              isPending={updateCommunityRoleMutation.isPending}
              onSubmit={(values) =>
                updateCommunityRoleMutation.mutate({
                  communityRoleId: editingRole.id,
                  data: values,
                })
              }
              submitLabel="Save Changes"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDeletePendingRole(null)
          }
        }}
        open={Boolean(deletePendingRole)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Delete {deletePendingRole?.name ?? 'this role'} and its backing Better Auth team?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t pt-3">
            <Button onClick={() => setDeletePendingRole(null)} type="button" variant="outline">
              Cancel
            </Button>
            <Button
              disabled={deleteCommunityRoleMutation.isPending || !deletePendingRole}
              onClick={() =>
                deletePendingRole
                  ? deleteCommunityRoleMutation.mutate({
                      communityRoleId: deletePendingRole.id,
                    })
                  : undefined
              }
              type="button"
              variant="destructive"
            >
              Delete Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
