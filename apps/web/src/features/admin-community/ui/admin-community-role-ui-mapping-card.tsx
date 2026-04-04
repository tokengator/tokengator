import { Button } from '@tokengator/ui/components/button'
import { Label } from '@tokengator/ui/components/label'

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
          <Label htmlFor={id}>Discord Role</Label>
          <select
            className="bg-background border px-2 py-1 text-sm"
            disabled={isPending || !canConfigureDiscordMappings}
            id={id}
            onChange={(event) => onDraftChange(event.target.value)}
            value={currentDiscordRoleDraft}
          >
            <option value="">Not mapped</option>
            {missingMappedRoleOption ? (
              <option value={missingMappedRoleOption.id}>{missingMappedRoleOption.label}</option>
            ) : null}
            {options.map((option) => (
              <option disabled={option.disabled} key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
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
