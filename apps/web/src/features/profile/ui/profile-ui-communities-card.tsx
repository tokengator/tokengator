import type { OrganizationMembershipEntity } from '@tokengator/sdk'

import { CommunityUiItem } from '@/features/community/ui/community-ui-item'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

interface ProfileUiCommunitiesCardProps {
  communities: OrganizationMembershipEntity[]
  isPending?: boolean
}

function formatCommunityRole(role: string) {
  return role.replaceAll('-', ' ')
}

export function ProfileUiCommunitiesCard({ communities, isPending = false }: ProfileUiCommunitiesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Communities</CardTitle>
        <CardDescription>Communities you belong to in TokenGator.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {isPending ? <p className="text-muted-foreground">Loading communities...</p> : null}
        {!isPending && communities.length === 0 ? <p className="text-muted-foreground">No communities yet.</p> : null}
        {!isPending
          ? communities.map((community) => (
              <CommunityUiItem
                community={community}
                footer={
                  community.gatedRoles?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {community.gatedRoles.map((gatedRole) => (
                        <span className="bg-muted rounded-full px-2 py-1 text-xs" key={gatedRole.id}>
                          {gatedRole.name}
                        </span>
                      ))}
                    </div>
                  ) : null
                }
                key={community.id}
                meta={<span className="capitalize">{formatCommunityRole(community.role)}</span>}
              />
            ))
          : null}
      </CardContent>
    </Card>
  )
}
