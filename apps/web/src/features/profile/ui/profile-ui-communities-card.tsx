import type { OrganizationMembershipEntity } from '@tokengator/sdk'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { UiListCard, UiListCardHeader, UiListCardMeta } from '@tokengator/ui/components/ui-list-card'

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
              <UiListCard key={community.id}>
                <UiListCardHeader>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{community.name}</p>
                    <UiListCardMeta>@{community.slug}</UiListCardMeta>
                  </div>
                  <UiListCardMeta className="capitalize">{formatCommunityRole(community.role)}</UiListCardMeta>
                </UiListCardHeader>
                {community.gatedRoles?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {community.gatedRoles.map((gatedRole) => (
                      <span className="bg-muted rounded-full px-2 py-1 text-xs" key={gatedRole.id}>
                        {gatedRole.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </UiListCard>
            ))
          : null}
      </CardContent>
    </Card>
  )
}
