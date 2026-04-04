import type { ReactNode } from 'react'
import { PencilLine, Trash2 } from 'lucide-react'
import { Button } from '@tokengator/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { UiStatus, type UiStatusVariants } from '@tokengator/ui/components/ui-status'

interface AdminCommunityRoleUiCardCondition {
  assetGroupAddress: string
  assetGroupEnabled: boolean
  assetGroupLabel: string
  assetGroupType: string
  id: string
  maximumAmount: string | null
  minimumAmount: string
}

interface AdminCommunityRoleUiCardProps {
  conditions: AdminCommunityRoleUiCardCondition[]
  discordMappingLabel: string
  discordMappingStatusLabel: string
  discordMappingTone: UiStatusVariants['tone']
  enabled: boolean
  mappingContent: ReactNode
  matchMode: string
  name: string
  onDelete: () => void
  onEdit: () => void
  previewAddCount: number
  previewRemoveCount: number
  slug: string
  teamMemberCount: number
  teamName: string
}

export function AdminCommunityRoleUiCard(props: AdminCommunityRoleUiCardProps) {
  const {
    conditions,
    discordMappingLabel,
    discordMappingStatusLabel,
    discordMappingTone,
    enabled,
    mappingContent,
    matchMode,
    name,
    onDelete,
    onEdit,
    previewAddCount,
    previewRemoveCount,
    slug,
    teamMemberCount,
    teamName,
  } = props

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base">{name}</CardTitle>
          <CardDescription>
            Team: {teamName} · Slug: {slug} · Match: {matchMode.toUpperCase()} · {enabled ? 'enabled' : 'disabled'}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button onClick={onEdit} type="button" variant="outline">
            <PencilLine className="size-4" />
            Edit
          </Button>
          <Button onClick={onDelete} type="button" variant="outline">
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="grid gap-2 md:grid-cols-3">
          <div className="rounded-lg border p-3">
            <div className="text-muted-foreground">Current Team Members</div>
            <div>{teamMemberCount}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-muted-foreground">Preview Diff</div>
            <div>
              +{previewAddCount} / -{previewRemoveCount}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-muted-foreground">Discord Mapping</div>
            <div className="mt-1">
              <UiStatus tone={discordMappingTone}>{discordMappingStatusLabel}</UiStatus>
            </div>
            <div className="text-muted-foreground mt-2">{discordMappingLabel}</div>
          </div>
        </div>
        {mappingContent}
        <div className="grid gap-2">
          {conditions.map((condition) => (
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
                <div className="text-destructive text-xs">This asset group is disabled and will not qualify users.</div>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
