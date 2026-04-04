import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@tokengator/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tokengator/ui/components/dialog'

import { useAdminCommunityGetQuery } from '@/features/admin-community/data-access/use-admin-community-get-query'
import { orpc } from '@/utils/orpc'
import { Route as CommunityRoute } from './route'

const roleOptions = ['owner', 'admin', 'member'] as const

export const Route = createFileRoute('/admin/communities/$organizationId/members')({
  component: RouteComponent,
})

function RouteComponent() {
  const queryClient = useQueryClient()
  const { organization: initialOrganization } = CommunityRoute.useRouteContext()
  const organizationId = initialOrganization.id
  const [memberPendingRemoval, setMemberPendingRemoval] = useState<{
    id: string
    name: string
  } | null>(null)
  const { data } = useAdminCommunityGetQuery(organizationId, {
    initialData: initialOrganization,
  })
  const removeMemberMutation = useMutation(
    orpc.adminOrganization.removeMember.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.adminOrganization.get.key({
            input: {
              organizationId,
            },
          }),
        })
        await queryClient.invalidateQueries({
          queryKey: orpc.adminOrganization.list.key(),
        })
        setMemberPendingRemoval(null)
        toast.success('Member removed.')
      },
    }),
  )
  const updateMemberRoleMutation = useMutation(
    orpc.adminOrganization.updateMemberRole.mutationOptions({
      onError: (error) => {
        toast.error(error.message)
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.adminOrganization.get.key({
            input: {
              organizationId,
            },
          }),
        })
        await queryClient.invalidateQueries({
          queryKey: orpc.adminOrganization.list.key(),
        })
        toast.success('Member role updated.')
      },
    }),
  )

  function handleRemoveMember(memberId: string, memberName: string) {
    setMemberPendingRemoval({
      id: memberId,
      name: memberName,
    })
  }

  function handleRemoveMemberConfirm() {
    if (!memberPendingRemoval) {
      return
    }

    removeMemberMutation.mutate({
      memberId: memberPendingRemoval.id,
    })
  }

  if (!data) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>Update roles or remove members from the community.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {data.members.length ? (
          <>
            {data.members.map((member) => {
              const memberRoles = roleOptions.includes(member.role as (typeof roleOptions)[number])
                ? roleOptions
                : [member.role, ...roleOptions]

              return (
                <div className="grid gap-3 border p-3 md:grid-cols-[1fr_140px_auto]" key={member.id}>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm">{member.name}</p>
                    {member.username ? <p className="text-muted-foreground text-xs">@{member.username}</p> : null}
                    <p className="text-muted-foreground text-xs">
                      {member.isManaged ? 'Managed by TokenGator' : 'Manual membership'}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Gated roles:{' '}
                      {member.gatedRoles.length
                        ? member.gatedRoles.map((gatedRole) => gatedRole.name).join(', ')
                        : 'none'}
                    </p>
                  </div>
                  <select
                    aria-label={`Role for ${member.name}`}
                    className="bg-background border px-2 py-1 text-sm"
                    disabled={updateMemberRoleMutation.isPending}
                    onChange={(event) =>
                      updateMemberRoleMutation.mutate({
                        memberId: member.id,
                        role: event.target.value as (typeof roleOptions)[number],
                      })
                    }
                    value={member.role}
                  >
                    {memberRoles.map((role) => {
                      const isSupportedRole = roleOptions.includes(role as (typeof roleOptions)[number])

                      return (
                        <option disabled={!isSupportedRole} key={role} value={role}>
                          {role}
                        </option>
                      )
                    })}
                  </select>
                  <Button
                    disabled={removeMemberMutation.isPending}
                    onClick={() => handleRemoveMember(member.id, member.name)}
                    type="button"
                    variant="outline"
                  >
                    Remove
                  </Button>
                </div>
              )
            })}
            <Dialog
              onOpenChange={(isOpen) => {
                if (!isOpen) {
                  setMemberPendingRemoval(null)
                }
              }}
              open={Boolean(memberPendingRemoval)}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Remove Member</DialogTitle>
                  <DialogDescription>
                    Remove {memberPendingRemoval?.name ?? 'this member'} from this community?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="border-t pt-3">
                  <Button onClick={() => setMemberPendingRemoval(null)} type="button" variant="outline">
                    Cancel
                  </Button>
                  <Button
                    disabled={removeMemberMutation.isPending}
                    onClick={handleRemoveMemberConfirm}
                    type="button"
                    variant="destructive"
                  >
                    Remove Member
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">This community has no members.</p>
        )}
      </CardContent>
    </Card>
  )
}
