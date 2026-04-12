import { Button } from '@tokengator/ui/components/button'
import { Label } from '@tokengator/ui/components/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@tokengator/ui/components/select'

export interface AdminCommunityRoleUiMappingOption {
  disabled: boolean
  id: string
  label: string
}

interface AdminCommunityRoleUiMappingCardProps {
  canClear: boolean
  canConfigureDiscordMappings: boolean
  canSave: boolean
  currentDiscordRoleDraft: string
  diagnostics: string[]
  id: string
  isPending: boolean
  mappingConflictMessage?: string
  missingMappedRoleOption?: {
    id: string
    label: string
  }
  onClear: () => void
  onDraftChange: (value: string) => void
  onSave: () => void
  options: AdminCommunityRoleUiMappingOption[]
  showDisabledRoleNote: boolean
  statusMessage: string
}

const notMappedDiscordRoleValue = '__not-mapped__'

export function AdminCommunityRoleUiMappingCard(props: AdminCommunityRoleUiMappingCardProps) {
  const {
    canClear,
    canConfigureDiscordMappings,
    canSave,
    currentDiscordRoleDraft,
    diagnostics,
    id,
    isPending,
    mappingConflictMessage,
    missingMappedRoleOption,
    onClear,
    onDraftChange,
    onSave,
    options,
    showDisabledRoleNote,
    statusMessage,
  } = props
  const discordRoleItems = [
    {
      label: 'Not mapped',
      value: notMappedDiscordRoleValue,
    },
    ...(missingMappedRoleOption
      ? [
          {
            label: missingMappedRoleOption.label,
            value: missingMappedRoleOption.id,
          },
        ]
      : []),
    ...options.map((option) => ({
      label: option.label,
      value: option.id,
    })),
  ]

  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-medium">Discord Role Target</div>
          <div className="text-muted-foreground">
            Select one Discord role from the connected server for this TokenGator role.
          </div>
        </div>
        {showDisabledRoleNote ? (
          <div className="text-muted-foreground text-xs">
            Disabled roles keep their mapping but will not drive later Discord sync until re-enabled.
          </div>
        ) : null}
      </div>
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
        <div className="grid gap-1.5">
          <Label id={`${id}-label`}>Discord Role</Label>
          <Select
            disabled={isPending || !canConfigureDiscordMappings}
            items={discordRoleItems}
            onValueChange={(value) => {
              if (value === null) {
                return
              }

              onDraftChange(value === notMappedDiscordRoleValue ? '' : value)
            }}
            value={currentDiscordRoleDraft || notMappedDiscordRoleValue}
          >
            <SelectTrigger aria-labelledby={`${id}-label`} className="w-full" id={id}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={notMappedDiscordRoleValue}>Not mapped</SelectItem>
              {missingMappedRoleOption ? (
                <SelectItem value={missingMappedRoleOption.id}>{missingMappedRoleOption.label}</SelectItem>
              ) : null}
              {options.map((option) => (
                <SelectItem disabled={option.disabled} key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button disabled={!canSave || isPending} onClick={onSave} type="button">
          Save Mapping
        </Button>
        <Button disabled={!canClear || isPending} onClick={onClear} type="button" variant="outline">
          Clear
        </Button>
      </div>
      {!canConfigureDiscordMappings ? (
        <div className="text-muted-foreground text-xs">
          Fix the Discord server connection above before saving new role mappings. Clearing an existing mapping still
          works.
        </div>
      ) : null}
      {mappingConflictMessage ? <div className="text-destructive text-xs">{mappingConflictMessage}</div> : null}
      {diagnostics.length ? (
        <div className="grid gap-1">
          <div className="font-medium">Mapping Diagnostics</div>
          <ol className="list-decimal space-y-1 pl-5 text-xs">
            {diagnostics.map((diagnostic) => (
              <li key={`${id}-${diagnostic}`}>{diagnostic}</li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="text-muted-foreground text-xs">{statusMessage}</div>
      )}
    </div>
  )
}
