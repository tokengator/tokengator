import { Link } from '@tanstack/react-router'

import { CommunityUiAvatar } from './community-ui-avatar'

export function CommunityUiGridItem({
  community,
}: {
  community: {
    logo: string | null
    name: string
    slug: string
  }
}) {
  return (
    <Link
      className="bg-card hover:bg-muted/60 ring-foreground/10 flex aspect-square flex-col items-center justify-center gap-3 rounded-lg p-4 text-center text-sm ring-1 transition-colors"
      params={{ slug: community.slug }}
      to="/communities/$slug/overview"
    >
      <CommunityUiAvatar community={community} size="lg" />
      <span className="line-clamp-2 font-medium">{community.name}</span>
    </Link>
  )
}
