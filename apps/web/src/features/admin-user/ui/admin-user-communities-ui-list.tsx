import type { AdminOrganizationMemberRole, AdminUserCommunityEntity } from '@tokengator/sdk'

import { CommunityUiItem } from '@/features/community/ui/community-ui-item'

import { Button } from '@tokengator/ui/components/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@tokengator/ui/components/select'

const roleOptions = ['owner', 'admin', 'member'] as const satisfies readonly AdminOrganizationMemberRole[]

function isAdminOrganizationMemberRole(value: string): value is AdminOrganizationMemberRole {
  return roleOptions.includes(value as AdminOrganizationMemberRole)
}

export function AdminUserCommunitiesUiList(props: {
  communities: AdminUserCommunityEntity[]
  isRemovePending: boolean
  isUpdatePending: boolean
  onRemove: (memberId: string) => void | Promise<void>
  onRoleChange: (memberId: string, role: AdminOrganizationMemberRole) => void | Promise<void>
}) {
  const { communities, isRemovePending, isUpdatePending, onRemove, onRoleChange } = props

  if (!communities.length) {
    return <p className="text-muted-foreground text-sm">This user has no communities.</p>
  }

  return (
    <div className="grid gap-3">
      {communities.map((community) => {
        const communityRoles = roleOptions.includes(community.role as AdminOrganizationMemberRole)
          ? roleOptions
          : [community.role, ...roleOptions]

        return (
          <CommunityUiItem
            action={
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Select
                  disabled={isUpdatePending}
                  onValueChange={(value) => {
                    if (value === null) {
                      return
                    }

                    const nextRole = value

                    if (!isAdminOrganizationMemberRole(nextRole)) {
                      return
                    }

                    void onRoleChange(community.id, nextRole)
                  }}
                  value={community.role}
                >
                  <SelectTrigger aria-label={`Role for ${community.name}`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {communityRoles.map((role) => {
                      const isSupportedRole = roleOptions.includes(role as AdminOrganizationMemberRole)

                      return (
                        <SelectItem disabled={!isSupportedRole} key={role} value={role}>
                          {role}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <Button
                  disabled={isRemovePending}
                  onClick={() => void onRemove(community.id)}
                  type="button"
                  variant="outline"
                >
                  Remove
                </Button>
              </div>
            }
            community={community}
            footer={
              <span className="text-muted-foreground text-xs">
                Gated roles:{' '}
                {community.gatedRoles.length
                  ? community.gatedRoles.map((gatedRole) => gatedRole.name).join(', ')
                  : 'none'}
              </span>
            }
            key={community.id}
          />
        )
      })}
    </div>
  )
}
