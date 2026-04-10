import { useState } from 'react'
import type { AdminOrganizationDetailEntity, AdminOrganizationMemberRole } from '@tokengator/sdk'

import { AdminCommunityMembershipUiListItem } from './admin-community-membership-ui-list-item'
import { AdminCommunityMembershipUiRemoveDialog } from './admin-community-membership-ui-remove-dialog'

interface AdminCommunityMembershipUiListProps {
  isRemovePending: boolean
  isUpdatePending: boolean
  members: AdminOrganizationDetailEntity['members']
  onMemberRemove: (memberId: string) => Promise<boolean>
  onMemberRoleUpdate: (memberId: string, role: AdminOrganizationMemberRole) => Promise<void>
}

export function AdminCommunityMembershipUiList(props: AdminCommunityMembershipUiListProps) {
  const { isRemovePending, isUpdatePending, members, onMemberRemove, onMemberRoleUpdate } = props
  const [memberPendingRemoval, setMemberPendingRemoval] = useState<Pick<
    AdminOrganizationDetailEntity['members'][number],
    'id' | 'name'
  > | null>(null)

  async function handleRemoveMember() {
    if (!memberPendingRemoval) {
      return
    }

    const didRemove = await onMemberRemove(memberPendingRemoval.id)

    if (didRemove) {
      setMemberPendingRemoval(null)
    }
  }

  if (!members.length) {
    return <p className="text-muted-foreground text-sm">This community has no members.</p>
  }

  return (
    <>
      {members.map((member) => (
        <AdminCommunityMembershipUiListItem
          isRemovePending={isRemovePending}
          isUpdatePending={isUpdatePending}
          key={member.id}
          member={member}
          onRemove={() =>
            setMemberPendingRemoval({
              id: member.id,
              name: member.name,
            })
          }
          onRoleChange={(role) => void onMemberRoleUpdate(member.id, role)}
        />
      ))}

      <AdminCommunityMembershipUiRemoveDialog
        isPending={isRemovePending}
        memberName={memberPendingRemoval?.name ?? null}
        onConfirm={() => void handleRemoveMember()}
        onOpenChange={(open) => {
          if (!open && !isRemovePending) {
            setMemberPendingRemoval(null)
          }
        }}
        open={Boolean(memberPendingRemoval)}
      />
    </>
  )
}
