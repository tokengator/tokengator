import type { AdminCommunityGetResult } from '../data-access/use-admin-community-get-query'

import { Button } from '@tokengator/ui/components/button'

export type AdminCommunityMembershipRole = 'admin' | 'member' | 'owner'

const roleOptions = ['owner', 'admin', 'member'] as const

interface AdminCommunityMembershipUiListItemProps {
  isRemovePending: boolean
  isUpdatePending: boolean
  member: AdminCommunityGetResult['members'][number]
  onRemove: () => void
  onRoleChange: (role: AdminCommunityMembershipRole) => void
}

export function AdminCommunityMembershipUiListItem(props: AdminCommunityMembershipUiListItemProps) {
  const { isRemovePending, isUpdatePending, member, onRemove, onRoleChange } = props
  const displayName = member.name || (member.username ? `@${member.username}` : member.id)
  const memberRoles = roleOptions.includes(member.role as AdminCommunityMembershipRole)
    ? roleOptions
    : [member.role, ...roleOptions]

  return (
    <div className="grid gap-3 border p-3 md:grid-cols-[1fr_140px_auto]">
      <div className="flex flex-col gap-1">
        <p className="text-sm">{displayName}</p>
        {member.username ? <p className="text-muted-foreground text-xs">@{member.username}</p> : null}
        <p className="text-muted-foreground text-xs">
          {member.isManaged ? 'Managed by TokenGator' : 'Manual membership'}
        </p>
        <p className="text-muted-foreground text-xs">
          Gated roles:{' '}
          {member.gatedRoles.length ? member.gatedRoles.map((gatedRole) => gatedRole.name).join(', ') : 'none'}
        </p>
      </div>
      <select
        aria-label={`Role for ${displayName}`}
        className="bg-background border px-2 py-1 text-sm"
        disabled={isUpdatePending}
        onChange={(event) => onRoleChange(event.target.value as AdminCommunityMembershipRole)}
        value={member.role}
      >
        {memberRoles.map((role) => {
          const isSupportedRole = roleOptions.includes(role as AdminCommunityMembershipRole)

          return (
            <option disabled={!isSupportedRole} key={role} value={role}>
              {role}
            </option>
          )
        })}
      </select>
      <Button disabled={isRemovePending} onClick={onRemove} type="button" variant="outline">
        Remove
      </Button>
    </div>
  )
}
