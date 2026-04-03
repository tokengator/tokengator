import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
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

import { formatTimestamp, getFreshnessClassName } from '@/utils/admin-automation'
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

type CommunityRoleRecord = Awaited<ReturnType<typeof orpc.adminCommunityRole.list.call>>['communityRoles'][number]
type DiscordGuildRoleRecord = Awaited<
  ReturnType<typeof orpc.adminCommunityRole.listDiscordGuildRoles.call>
>['guildRoles'][number]
type DiscordGuildRolesResult = Awaited<ReturnType<typeof orpc.adminCommunityRole.listDiscordGuildRoles.call>>
type DiscordRoleSyncResult =
  | Awaited<ReturnType<typeof orpc.adminCommunityRole.applyDiscordRoleSync.call>>
  | Awaited<ReturnType<typeof orpc.adminCommunityRole.previewDiscordRoleSync.call>>
type CommunityRoleSyncRunsResult = Awaited<ReturnType<typeof orpc.adminCommunityRole.listRuns.call>>
type CommunityDiscordSyncRunsResult = Extract<CommunityRoleSyncRunsResult, { kind: 'discord' }>
type CommunityMembershipSyncRunsResult = Extract<CommunityRoleSyncRunsResult, { kind: 'membership' }>

const discordCheckLabels: Record<string, string> = {
  already_correct: 'Discord role is already correct.',
  bot_identity_lookup_failed: 'TokenGator could not identify the Discord bot account.',
  bot_not_in_guild: 'The Discord bot is not a member of this server yet.',
  bot_token_missing: 'The Discord bot token is not configured for the API environment.',
  discord_api_failure: 'Discord API request failed during reconcile.',
  discord_connection_missing: 'Connect a Discord server for this community before mapping roles.',
  discord_role_hierarchy_blocked: 'The bot role must be above this Discord role in the server hierarchy.',
  discord_role_is_default: 'The @everyone role cannot be used for TokenGator role mapping.',
  discord_role_managed: 'Managed or integration-owned Discord roles cannot be used for TokenGator role mapping.',
  discord_role_not_found: 'The mapped Discord role no longer exists in the connected server.',
  discord_validation_unavailable: 'Discord role validation is unavailable right now.',
  guild_fetch_failed: 'TokenGator could not load the Discord server details.',
  guild_not_found: 'The Discord server could not be found from the configured guild ID.',
  guild_roles_fetch_failed: 'TokenGator could not load the Discord role list for this server.',
  linked_but_not_in_guild: 'This linked Discord account is not in the connected server.',
  manage_roles_missing: 'The Discord bot is missing the Manage Roles permission.',
  mapping_missing: 'This TokenGator role is not mapped to a Discord role yet.',
  mapping_not_assignable: 'The mapped Discord role is not assignable by the bot right now.',
  no_discord_account_linked: 'This user has no linked Discord account.',
  will_grant: 'Discord role will be granted.',
  will_revoke: 'Discord role will be revoked.',
}

function formatDiscordCheck(
  check: string,
  options?: {
    botHighestRolePosition?: number | null
    guildRolePosition?: number | null
  },
) {
  if (
    check === 'discord_role_hierarchy_blocked' &&
    options?.botHighestRolePosition !== null &&
    options?.botHighestRolePosition !== undefined &&
    options?.guildRolePosition !== null &&
    options?.guildRolePosition !== undefined &&
    options.botHighestRolePosition === options.guildRolePosition
  ) {
    return 'The bot role is on the same level as this Discord role. Move the bot role above it in the server hierarchy.'
  }

  return discordCheckLabels[check] ?? check.replaceAll('_', ' ')
}

function formatLastCheckedAt(value: Date | string | null) {
  return formatTimestamp(value)
}

function getSyncRunStatusClassName(status: string) {
  if (status === 'succeeded') {
    return 'border border-emerald-600/30 bg-emerald-600/10 px-2 py-1 text-xs font-medium text-emerald-700'
  }

  if (status === 'partial') {
    return 'border border-amber-600/30 bg-amber-600/10 px-2 py-1 text-xs font-medium text-amber-700'
  }

  if (status === 'failed') {
    return 'border border-red-600/30 bg-red-600/10 px-2 py-1 text-xs font-medium text-red-700'
  }

  return 'border px-2 py-1 text-xs font-medium'
}

function getDiscordMappingStatusClassName(status: 'needs_attention' | 'not_mapped' | 'ready') {
  if (status === 'ready') {
    return 'border border-emerald-600/30 bg-emerald-600/10 px-2 py-1 text-xs font-medium text-emerald-700'
  }

  if (status === 'needs_attention') {
    return 'border border-amber-600/30 bg-amber-600/10 px-2 py-1 text-xs font-medium text-amber-700'
  }

  return 'border px-2 py-1 text-xs font-medium'
}

function getDiscordOutcomeStatusClassName(status: string) {
  if (status === 'already_correct') {
    return 'border border-slate-500/30 bg-slate-500/10 px-2 py-1 text-xs font-medium text-slate-700'
  }

  if (status === 'will_grant') {
    return 'border border-emerald-600/30 bg-emerald-600/10 px-2 py-1 text-xs font-medium text-emerald-700'
  }

  if (status === 'will_revoke') {
    return 'border border-orange-600/30 bg-orange-600/10 px-2 py-1 text-xs font-medium text-orange-700'
  }

  if (status === 'discord_api_failure') {
    return 'border border-red-600/30 bg-red-600/10 px-2 py-1 text-xs font-medium text-red-700'
  }

  return 'border border-amber-600/30 bg-amber-600/10 px-2 py-1 text-xs font-medium text-amber-700'
}

function normalizeDiscordRoleName(name: string) {
  return name.replaceAll(/\s+/g, ' ').trim().toLowerCase()
}

function getDiscordMappingState(input: {
  discordGuildRoles?: DiscordGuildRolesResult
  discordGuildRolesError: boolean
  role: CommunityRoleRecord
}) {
  if (!input.role.discordRoleId) {
    return {
      checks: [] as string[],
      guildRole: null as DiscordGuildRoleRecord | null,
      status: 'not_mapped' as const,
    }
  }

  if (input.discordGuildRolesError) {
    return {
      checks: ['discord_validation_unavailable'],
      guildRole: null,
      status: 'needs_attention' as const,
    }
  }

  if (!input.discordGuildRoles?.connection) {
    return {
      checks: ['discord_connection_missing'],
      guildRole: null,
      status: 'needs_attention' as const,
    }
  }

  const guildRole = input.discordGuildRoles.guildRoles.find(
    (currentGuildRole) => currentGuildRole.id === input.role.discordRoleId,
  )

  if (!guildRole) {
    return {
      checks: ['discord_role_not_found'],
      guildRole: null,
      status: 'needs_attention' as const,
    }
  }

  const checks = [
    ...new Set(
      [...input.discordGuildRoles.connection.diagnostics.checks, ...guildRole.checks].sort((left, right) =>
        left.localeCompare(right),
      ),
    ),
  ]

  return {
    checks,
    guildRole,
    status: guildRole.assignable && checks.length === 0 ? ('ready' as const) : ('needs_attention' as const),
  }
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
  const [discordRoleDrafts, setDiscordRoleDrafts] = useState<Record<string, string>>({})
  const [discordSyncResult, setDiscordSyncResult] = useState<DiscordRoleSyncResult | null>(null)
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<Awaited<
    ReturnType<typeof orpc.adminCommunityRole.previewSync.call>
  > | null>(null)
  const invalidateCommunitySyncQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: orpc.adminCommunityRole.getSyncStatus.key(),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.adminCommunityRole.listRuns.key(),
      }),
    ])
  }
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
  const communityDiscordRuns = useQuery(
    orpc.adminCommunityRole.listRuns.queryOptions({
      input: {
        kind: 'discord',
        limit: 5,
        organizationId,
      },
    }),
  )
  const discordGuildRoles = useQuery(
    orpc.adminCommunityRole.listDiscordGuildRoles.queryOptions({
      input: {
        organizationId,
      },
    }),
  )
  const communityMembershipRuns = useQuery(
    orpc.adminCommunityRole.listRuns.queryOptions({
      input: {
        kind: 'membership',
        limit: 5,
        organizationId,
      },
    }),
  )
  const communitySyncStatus = useQuery(
    orpc.adminCommunityRole.getSyncStatus.queryOptions({
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
        await Promise.all([
          invalidateCommunitySyncQueries(),
          queryClient.invalidateQueries({
            queryKey: orpc.adminCommunityRole.list.key({
              input: {
                organizationId,
              },
            }),
          }),
        ])
        setCreateDialogOpen(false)
        setDiscordSyncResult(null)
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
        await Promise.all([
          invalidateCommunitySyncQueries(),
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
        setDeletePendingRole(null)
        setDiscordSyncResult(null)
        setSyncResult(null)
        toast.success('Community role deleted.')
      },
    }),
  )
  const previewDiscordSyncMutation = useMutation(
    orpc.adminCommunityRole.previewDiscordRoleSync.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: (result) => {
        setDiscordSyncResult(result)
        toast.success('Discord role preview updated.')
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
  const applyDiscordSyncMutation = useMutation(
    orpc.adminCommunityRole.applyDiscordRoleSync.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async (result) => {
        setDiscordSyncResult(result)
        await invalidateCommunitySyncQueries()
        toast.success('Discord role reconcile applied.')
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
          invalidateCommunitySyncQueries(),
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
        await Promise.all([
          invalidateCommunitySyncQueries(),
          queryClient.invalidateQueries({
            queryKey: orpc.adminCommunityRole.list.key({
              input: {
                organizationId,
              },
            }),
          }),
        ])
        setEditingRoleId(null)
        setDiscordSyncResult(null)
        setSyncResult(null)
        toast.success('Community role updated.')
      },
    }),
  )
  const setDiscordRoleMappingMutation = useMutation(
    orpc.adminCommunityRole.setDiscordRoleMapping.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async (result, variables) => {
        await Promise.all([
          invalidateCommunitySyncQueries(),
          queryClient.invalidateQueries({
            queryKey: orpc.adminCommunityRole.list.key({
              input: {
                organizationId,
              },
            }),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.adminCommunityRole.listDiscordGuildRoles.key({
              input: {
                organizationId,
              },
            }),
          }),
        ])
        setDiscordRoleDrafts((currentDrafts) => {
          const nextDrafts = { ...currentDrafts }

          if (variables.discordRoleId === null) {
            nextDrafts[variables.communityRoleId] = ''
          } else {
            delete nextDrafts[variables.communityRoleId]
          }

          return nextDrafts
        })
        setDiscordSyncResult(null)
        toast.success(
          result.mapping.status === 'ready'
            ? 'Discord role mapping saved.'
            : variables.discordRoleId === null
              ? 'Discord role mapping cleared.'
              : 'Discord role mapping saved. Check diagnostics before syncing Discord roles.',
        )
      },
    }),
  )
  const assetGroupOptions = assetGroups.data?.assetGroups ?? []
  const discordConnection = discordGuildRoles.data?.connection ?? null
  const discordGuildRolesById = new Map(
    (discordGuildRoles.data?.guildRoles ?? []).map((guildRole) => [guildRole.id, guildRole] as const),
  )
  const mappedCommunityRolesByDiscordRoleId = new Map(
    (communityRoles.data?.communityRoles ?? [])
      .filter((communityRole) => communityRole.discordRoleId)
      .map((communityRole) => [communityRole.discordRoleId as string, communityRole] as const),
  )
  const canConfigureDiscordMappings =
    !discordGuildRoles.isPending &&
    !discordGuildRoles.error &&
    Boolean(discordConnection) &&
    (discordGuildRoles.data?.guildRoles.length ?? 0) > 0
  const editingRole =
    communityRoles.data?.communityRoles.find((communityRole) => communityRole.id === editingRoleId) ?? null
  const discordConnectionChecks = discordConnection?.diagnostics.checks ?? []
  const discordConnectionStatusClassName =
    discordConnection?.status === 'connected'
      ? 'border border-emerald-600/30 bg-emerald-600/10 px-2 py-1 text-xs font-medium text-emerald-700'
      : 'border border-amber-600/30 bg-amber-600/10 px-2 py-1 text-xs font-medium text-amber-700'
  const discordSyncActionRequiredCount = discordSyncResult
    ? discordSyncResult.summary.counts.discord_role_missing +
      discordSyncResult.summary.counts.linked_but_not_in_guild +
      discordSyncResult.summary.counts.mapping_missing +
      discordSyncResult.summary.counts.mapping_not_assignable +
      discordSyncResult.summary.counts.no_discord_account_linked
    : 0
  const discordSyncFailedCount =
    discordSyncResult && 'failedCount' in discordSyncResult.summary ? discordSyncResult.summary.failedCount : 0
  const dependencyAssetGroups = communitySyncStatus.data?.dependencyAssetGroups ?? []
  const discordStatus = communitySyncStatus.data?.discordStatus ?? null
  const membershipStatus = communitySyncStatus.data?.membershipStatus ?? null
  const recentDiscordRuns = (communityDiscordRuns.data?.runs ?? []) as CommunityDiscordSyncRunsResult['runs']
  const recentMembershipRuns = (communityMembershipRuns.data?.runs ?? []) as CommunityMembershipSyncRunsResult['runs']

  if (!organization.data) {
    return null
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Discord Role Mapping</CardTitle>
          <CardDescription>
            Map each TokenGator community role to one Discord role in this community’s connected server.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {discordGuildRoles.isPending ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading Discord role diagnostics...
            </div>
          ) : null}
          {discordGuildRoles.error ? (
            <div className="text-destructive text-sm">{discordGuildRoles.error.message}</div>
          ) : null}
          {!discordGuildRoles.isPending && !discordGuildRoles.error && !discordConnection ? (
            <div className="grid gap-2 rounded-lg border p-3 text-sm">
              <div className="font-medium">No Discord server connected</div>
              <p className="text-muted-foreground">
                Connect a Discord server in{' '}
                <Link
                  className="underline underline-offset-4"
                  params={{ organizationId }}
                  to="/admin/communities/$organizationId/settings"
                >
                  Settings
                </Link>{' '}
                before mapping community roles.
              </p>
            </div>
          ) : null}
          {discordConnection ? (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border p-3 text-sm">
                  <div className="text-muted-foreground">Discord Server</div>
                  <div>{discordConnection.guildName ?? 'Unknown'}</div>
                  <div className="text-muted-foreground">{discordConnection.guildId}</div>
                </div>
                <div className="rounded-lg border p-3 text-sm">
                  <div className="text-muted-foreground">Status</div>
                  <div className="mt-1">
                    <span className={discordConnectionStatusClassName}>
                      {discordConnection.status === 'connected' ? 'Connected' : 'Needs attention'}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-2">
                    Last checked: {formatLastCheckedAt(discordConnection.lastCheckedAt)}
                  </div>
                </div>
                <div className="rounded-lg border p-3 text-sm">
                  <div className="text-muted-foreground">Bot Role Readiness</div>
                  <div>
                    Manage Roles: {discordConnection.diagnostics.permissions.manageRoles ? 'Granted' : 'Missing'}
                  </div>
                  <div>
                    Highest role:{' '}
                    {discordConnection.diagnostics.botHighestRole
                      ? `${discordConnection.diagnostics.botHighestRole.name ?? 'Unknown'} (#${discordConnection.diagnostics.botHighestRole.position})`
                      : 'Unknown'}
                  </div>
                </div>
              </div>
              <div className="grid gap-2 rounded-lg border p-3">
                <div className="text-sm font-medium">Diagnostics</div>
                {discordConnectionChecks.length ? (
                  <ol className="list-decimal space-y-1 pl-5 text-sm">
                    {discordConnectionChecks.map((check) => (
                      <li key={check}>{formatDiscordCheck(check)}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-muted-foreground text-sm">Ready. Discord roles can be listed for this server.</p>
                )}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automation Health</CardTitle>
          <CardDescription>
            Scheduled freshness, dependency status, and recent failures for membership and Discord reconcile.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {communitySyncStatus.error ? (
            <div className="text-destructive text-sm">{communitySyncStatus.error.message}</div>
          ) : null}
          {communityMembershipRuns.error ? (
            <div className="text-destructive text-sm">{communityMembershipRuns.error.message}</div>
          ) : null}
          {communityDiscordRuns.error ? (
            <div className="text-destructive text-sm">{communityDiscordRuns.error.message}</div>
          ) : null}
          {communitySyncStatus.isPending ? (
            <div className="text-muted-foreground text-sm">Loading sync health...</div>
          ) : null}

          {membershipStatus && discordStatus ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2 rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">Membership</div>
                  <span className={getFreshnessClassName(membershipStatus.freshnessStatus)}>
                    {membershipStatus.freshnessStatus}
                  </span>
                </div>
                <div>Last success: {formatTimestamp(membershipStatus.lastSuccessfulRun?.finishedAt ?? null)}</div>
                <div>Last run: {membershipStatus.lastRun?.status ?? 'Never'}</div>
                <div className="text-muted-foreground">
                  {formatTimestamp(membershipStatus.lastRun?.startedAt ?? null)}
                </div>
                <div>State: {membershipStatus.isRunning ? 'running' : 'idle'}</div>
                <div className="text-muted-foreground">Stale after {membershipStatus.staleAfterMinutes} minutes</div>
                {membershipStatus.lastRun?.errorMessage ? (
                  <div className="text-destructive text-xs">{membershipStatus.lastRun.errorMessage}</div>
                ) : null}
              </div>
              <div className="grid gap-2 rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">Discord</div>
                  <span className={getFreshnessClassName(discordStatus.freshnessStatus)}>
                    {discordStatus.freshnessStatus}
                  </span>
                </div>
                <div>Last success: {formatTimestamp(discordStatus.lastSuccessfulRun?.finishedAt ?? null)}</div>
                <div>Last run: {discordStatus.lastRun?.status ?? 'Never'}</div>
                <div className="text-muted-foreground">{formatTimestamp(discordStatus.lastRun?.startedAt ?? null)}</div>
                <div>State: {discordStatus.isRunning ? 'running' : 'idle'}</div>
                <div className="text-muted-foreground">Stale after {discordStatus.staleAfterMinutes} minutes</div>
                {discordStatus.lastRun?.errorMessage ? (
                  <div className="text-destructive text-xs">{discordStatus.lastRun.errorMessage}</div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="grid gap-2 rounded-lg border p-3 text-sm">
            <div className="font-medium">Dependency Asset Groups</div>
            {!dependencyAssetGroups.length ? (
              <p className="text-muted-foreground text-sm">No indexed asset-group dependencies yet.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {dependencyAssetGroups.map((assetGroup) => (
                  <div className="rounded-lg border p-3" key={assetGroup.id}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{assetGroup.label}</div>
                      <span className={getFreshnessClassName(assetGroup.indexingStatus.freshnessStatus)}>
                        {assetGroup.indexingStatus.freshnessStatus}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      {assetGroup.type} · {assetGroup.address}
                    </div>
                    <div className="text-muted-foreground">
                      Last success: {formatTimestamp(assetGroup.indexingStatus.lastSuccessfulRun?.finishedAt ?? null)}
                    </div>
                    {!assetGroup.enabled ? (
                      <div className="text-muted-foreground text-xs">Disabled asset group</div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2 rounded-lg border p-3 text-sm">
              <div className="font-medium">Recent Membership Runs</div>
              {!recentMembershipRuns.length ? (
                <p className="text-muted-foreground text-sm">No membership runs yet.</p>
              ) : (
                recentMembershipRuns.map((run) => (
                  <div className="rounded-lg border p-3" key={run.id}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={getSyncRunStatusClassName(run.status)}>{run.status}</span>
                      <span className="text-muted-foreground text-xs">{run.triggerSource}</span>
                    </div>
                    <div className="mt-2">Started: {formatTimestamp(run.startedAt)}</div>
                    <div className="text-muted-foreground">Finished: {formatTimestamp(run.finishedAt)}</div>
                    <div className="text-muted-foreground">
                      {`Qualified ${run.qualifiedUserCount} · Changed ${run.usersChangedCount}`}
                    </div>
                    <div className="text-muted-foreground">
                      {`Org +${run.addToOrganizationCount} / -${run.removeFromOrganizationCount} · Teams +${run.addToTeamCount} / -${run.removeFromTeamCount}`}
                    </div>
                    {run.errorMessage ? <div className="text-destructive mt-2 text-xs">{run.errorMessage}</div> : null}
                  </div>
                ))
              )}
            </div>
            <div className="grid gap-2 rounded-lg border p-3 text-sm">
              <div className="font-medium">Recent Discord Runs</div>
              {!recentDiscordRuns.length ? (
                <p className="text-muted-foreground text-sm">No Discord runs yet.</p>
              ) : (
                recentDiscordRuns.map((run) => (
                  <div className="rounded-lg border p-3" key={run.id}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={getSyncRunStatusClassName(run.status)}>{run.status}</span>
                      <span className="text-muted-foreground text-xs">{run.triggerSource}</span>
                    </div>
                    <div className="mt-2">Started: {formatTimestamp(run.startedAt)}</div>
                    <div className="text-muted-foreground">Finished: {formatTimestamp(run.finishedAt)}</div>
                    {'appliedGrantCount' in run ? (
                      <>
                        <div className="text-muted-foreground">
                          {`Grants ${run.appliedGrantCount} · Revokes ${run.appliedRevokeCount} · Failed ${run.failedCount}`}
                        </div>
                        <div className="text-muted-foreground">
                          {`Roles ready ${run.rolesReadyCount} · blocked ${run.rolesBlockedCount} · users changed ${run.usersChangedCount}`}
                        </div>
                      </>
                    ) : null}
                    {run.errorMessage ? <div className="text-destructive mt-2 text-xs">{run.errorMessage}</div> : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Internal Membership Sync</CardTitle>
          <CardDescription>
            Preview and apply the current token-gated organization and team membership changes inside TokenGator.
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
              Preview Membership
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
              Apply Membership
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
        <CardHeader>
          <CardTitle>Discord Role Sync</CardTitle>
          <CardDescription>
            Preview and apply Discord role grants and revokes for linked users in the connected server.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={previewDiscordSyncMutation.isPending}
              onClick={() =>
                previewDiscordSyncMutation.mutate({
                  organizationId,
                })
              }
              type="button"
              variant="outline"
            >
              {previewDiscordSyncMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Preview Discord Roles
            </Button>
            <Button
              disabled={applyDiscordSyncMutation.isPending}
              onClick={() =>
                applyDiscordSyncMutation.mutate({
                  organizationId,
                })
              }
              type="button"
            >
              {applyDiscordSyncMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Apply Discord Reconcile
            </Button>
          </div>
          {discordSyncResult ? (
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-lg border p-3 text-sm">
                <div className="text-muted-foreground">Will Grant</div>
                <div>{discordSyncResult.summary.counts.will_grant}</div>
              </div>
              <div className="rounded-lg border p-3 text-sm">
                <div className="text-muted-foreground">Will Revoke</div>
                <div>{discordSyncResult.summary.counts.will_revoke}</div>
              </div>
              <div className="rounded-lg border p-3 text-sm">
                <div className="text-muted-foreground">Already Correct</div>
                <div>{discordSyncResult.summary.counts.already_correct}</div>
              </div>
              <div className="rounded-lg border p-3 text-sm">
                <div className="text-muted-foreground">Action Required</div>
                <div>{discordSyncActionRequiredCount}</div>
                {'failedCount' in discordSyncResult.summary ? <div>Failed: {discordSyncFailedCount}</div> : null}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Run a preview to inspect the next Discord role reconcile.</p>
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
            const currentDiscordMappingState = getDiscordMappingState({
              discordGuildRoles: discordGuildRoles.data,
              discordGuildRolesError: Boolean(discordGuildRoles.error),
              role: communityRole,
            })
            const hasDiscordRoleDraft = Object.prototype.hasOwnProperty.call(discordRoleDrafts, communityRole.id)
            const autoSelectedDiscordRoleMatches =
              hasDiscordRoleDraft || communityRole.discordRoleId
                ? []
                : (discordGuildRoles.data?.guildRoles ?? []).filter((guildRole) => {
                    const mappedOwner = mappedCommunityRolesByDiscordRoleId.get(guildRole.id)

                    if (guildRole.isDefault || guildRole.managed) {
                      return false
                    }

                    if (mappedOwner && mappedOwner.id !== communityRole.id) {
                      return false
                    }

                    return normalizeDiscordRoleName(guildRole.name) === normalizeDiscordRoleName(communityRole.name)
                  })
            const autoSelectedDiscordRoleId =
              autoSelectedDiscordRoleMatches.length === 1 ? autoSelectedDiscordRoleMatches[0].id : ''
            const currentDiscordRoleDraft = hasDiscordRoleDraft
              ? (discordRoleDrafts[communityRole.id] ?? '')
              : (communityRole.discordRoleId ?? autoSelectedDiscordRoleId)
            const currentGuildRole = currentDiscordMappingState.guildRole
            const isDiscordRoleMappingDirty = currentDiscordRoleDraft !== (communityRole.discordRoleId ?? '')
            const isDiscordRoleMappingPending =
              setDiscordRoleMappingMutation.isPending &&
              setDiscordRoleMappingMutation.variables?.communityRoleId === communityRole.id
            const mappedDiscordRole = communityRole.discordRoleId
              ? (discordGuildRolesById.get(communityRole.discordRoleId) ?? null)
              : null
            const mappedDiscordRoleMissing = Boolean(communityRole.discordRoleId) && !mappedDiscordRole
            const selectedDraftRoleOwner = currentDiscordRoleDraft
              ? (mappedCommunityRolesByDiscordRoleId.get(currentDiscordRoleDraft) ?? null)
              : null
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
                  <div className="grid gap-2 md:grid-cols-3">
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
                    <div className="rounded-lg border p-3">
                      <div className="text-muted-foreground">Discord Mapping</div>
                      <div className="mt-1">
                        <span className={getDiscordMappingStatusClassName(currentDiscordMappingState.status)}>
                          {currentDiscordMappingState.status === 'ready'
                            ? 'Ready'
                            : currentDiscordMappingState.status === 'needs_attention'
                              ? 'Needs attention'
                              : 'Not mapped'}
                        </span>
                      </div>
                      <div className="text-muted-foreground mt-2">
                        {currentGuildRole
                          ? `${currentGuildRole.name} (#${currentGuildRole.position})`
                          : communityRole.discordRoleId
                            ? `Missing role (${communityRole.discordRoleId})`
                            : 'No Discord role selected'}
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 rounded-lg border p-3">
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="font-medium">Discord Role Target</div>
                        <div className="text-muted-foreground">
                          Select one Discord role from the connected server for this TokenGator role.
                        </div>
                      </div>
                      {!communityRole.enabled ? (
                        <div className="text-muted-foreground text-xs">
                          Disabled roles keep their mapping but will not drive later Discord sync until re-enabled.
                        </div>
                      ) : null}
                    </div>
                    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
                      <div className="grid gap-1.5">
                        <Label htmlFor={`community-role-discord-role-${communityRole.id}`}>Discord Role</Label>
                        <select
                          className="bg-background border px-2 py-1 text-sm"
                          disabled={isDiscordRoleMappingPending || !canConfigureDiscordMappings}
                          id={`community-role-discord-role-${communityRole.id}`}
                          onChange={(event) =>
                            setDiscordRoleDrafts((currentDrafts) => ({
                              ...currentDrafts,
                              [communityRole.id]: event.target.value,
                            }))
                          }
                          value={currentDiscordRoleDraft}
                        >
                          <option value="">Not mapped</option>
                          {mappedDiscordRoleMissing && communityRole.discordRoleId ? (
                            <option
                              value={communityRole.discordRoleId}
                            >{`Missing Discord role (${communityRole.discordRoleId})`}</option>
                          ) : null}
                          {discordGuildRoles.data?.guildRoles.map((guildRole) => {
                            const mappedOwner = mappedCommunityRolesByDiscordRoleId.get(guildRole.id)
                            const mappedElsewhere = mappedOwner ? mappedOwner.id !== communityRole.id : false

                            if (guildRole.isDefault) {
                              return null
                            }

                            return (
                              <option
                                disabled={guildRole.managed || mappedElsewhere}
                                key={guildRole.id}
                                value={guildRole.id}
                              >
                                {`${guildRole.name} (#${guildRole.position})${
                                  guildRole.managed
                                    ? ' · managed'
                                    : mappedElsewhere
                                      ? ` · mapped to ${mappedOwner?.name ?? 'another role'}`
                                      : ''
                                }`}
                              </option>
                            )
                          })}
                        </select>
                      </div>
                      <Button
                        disabled={
                          isDiscordRoleMappingPending ||
                          !canConfigureDiscordMappings ||
                          !currentDiscordRoleDraft ||
                          !isDiscordRoleMappingDirty
                        }
                        onClick={() =>
                          setDiscordRoleMappingMutation.mutate({
                            communityRoleId: communityRole.id,
                            discordRoleId: currentDiscordRoleDraft,
                          })
                        }
                        type="button"
                      >
                        {isDiscordRoleMappingPending ? <Loader2 className="size-4 animate-spin" /> : null}
                        Save Mapping
                      </Button>
                      <Button
                        disabled={
                          isDiscordRoleMappingPending || (!communityRole.discordRoleId && !currentDiscordRoleDraft)
                        }
                        onClick={() =>
                          setDiscordRoleMappingMutation.mutate({
                            communityRoleId: communityRole.id,
                            discordRoleId: null,
                          })
                        }
                        type="button"
                        variant="outline"
                      >
                        Clear
                      </Button>
                    </div>
                    {!canConfigureDiscordMappings ? (
                      <div className="text-muted-foreground text-xs">
                        Fix the Discord server connection above before saving new role mappings. Clearing an existing
                        mapping still works.
                      </div>
                    ) : null}
                    {currentDiscordRoleDraft &&
                    selectedDraftRoleOwner &&
                    selectedDraftRoleOwner.id !== communityRole.id ? (
                      <div className="text-destructive text-xs">
                        This Discord role is already mapped to {selectedDraftRoleOwner.name}.
                      </div>
                    ) : null}
                    {currentDiscordMappingState.checks.length ? (
                      <div className="grid gap-1">
                        <div className="font-medium">Mapping Diagnostics</div>
                        <ol className="list-decimal space-y-1 pl-5 text-xs">
                          {currentDiscordMappingState.checks.map((check) => (
                            <li key={`${communityRole.id}-${check}`}>
                              {formatDiscordCheck(check, {
                                botHighestRolePosition:
                                  discordGuildRoles.data?.connection?.diagnostics.botHighestRole?.position ?? null,
                                guildRolePosition: currentGuildRole?.position ?? null,
                              })}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-xs">
                        {communityRole.discordRoleId
                          ? 'This Discord role is ready for Discord reconcile.'
                          : 'No Discord role selected yet.'}
                      </div>
                    )}
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

      {discordSyncResult ? (
        <Card>
          <CardHeader>
            <CardTitle>Discord Reconcile Details</CardTitle>
            <CardDescription>
              Inspect linked-account status, guild membership, and per-role Discord outcomes.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {!discordSyncResult.users.length ? (
              <p className="text-muted-foreground text-sm">
                No linked users or mapped Discord roles need review right now.
              </p>
            ) : null}
            {discordSyncResult.users.map((currentUser) => (
              <div className="grid gap-3 rounded-lg border p-3 text-sm" key={currentUser.userId}>
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-medium">{currentUser.name}</div>
                    <div className="text-muted-foreground">
                      {currentUser.username ? `@${currentUser.username}` : 'No username'} ·{' '}
                      {currentUser.wallets.length ? currentUser.wallets.join(', ') : 'No linked wallets'}
                    </div>
                  </div>
                  <div className="text-muted-foreground">
                    Discord: {currentUser.discordAccountId ?? 'not linked'} · Guild:{' '}
                    {currentUser.guildMemberPresent === null
                      ? 'unknown'
                      : currentUser.guildMemberPresent
                        ? 'present'
                        : 'absent'}
                  </div>
                </div>
                <div className="grid gap-2">
                  {currentUser.outcomes.map((outcome) => (
                    <div
                      className="grid gap-2 rounded-lg border p-3"
                      key={`${currentUser.userId}-${outcome.communityRoleId}`}
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="font-medium">{outcome.communityRoleName}</div>
                          <div className="text-muted-foreground">
                            Discord role: {outcome.discordRoleName ?? outcome.discordRoleId ?? 'not mapped'}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={getDiscordOutcomeStatusClassName(outcome.status)}>
                            {formatDiscordCheck(outcome.status)}
                          </span>
                          {'execution' in outcome ? (
                            <span className="border px-2 py-1 text-xs font-medium uppercase">{outcome.execution}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-muted-foreground">
                        Desired: {outcome.desired ? 'yes' : 'no'} · Current:{' '}
                        {outcome.current === null ? 'unknown' : outcome.current ? 'yes' : 'no'}
                        {'attemptedAction' in outcome && outcome.attemptedAction
                          ? ` · Action: ${outcome.attemptedAction}`
                          : ''}
                      </div>
                      {'errorMessage' in outcome && outcome.errorMessage ? (
                        <div className="text-destructive text-xs">{outcome.errorMessage}</div>
                      ) : null}
                      {outcome.checks.length ? (
                        <ol className="list-decimal space-y-1 pl-5 text-xs">
                          {outcome.checks.map((check) => (
                            <li key={`${currentUser.userId}-${outcome.communityRoleId}-${check}`}>
                              {formatDiscordCheck(check)}
                            </li>
                          ))}
                        </ol>
                      ) : null}
                    </div>
                  ))}
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
