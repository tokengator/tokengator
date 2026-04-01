import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

type ProfileCommunity = {
  gatedRoles: Array<{
    id: string
    name: string
    slug: string
  }>
  id: string
  logo: string | null
  name: string
  role: string
  slug: string
}

interface ProfileUiCommunitiesCardProps {
  communities: ProfileCommunity[]
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
              <div className="grid gap-1 rounded-lg border p-3" key={community.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{community.name}</p>
                    <p className="text-muted-foreground text-xs">@{community.slug}</p>
                  </div>
                  <p className="text-muted-foreground text-xs capitalize">{formatCommunityRole(community.role)}</p>
                </div>
                {community.gatedRoles?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {community.gatedRoles.map((gatedRole) => (
                      <span className="bg-muted rounded-full px-2 py-1 text-xs" key={gatedRole.id}>
                        {gatedRole.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          : null}
      </CardContent>
    </Card>
  )
}
