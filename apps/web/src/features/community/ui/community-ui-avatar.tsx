import type { ComponentProps } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@tokengator/ui/components/avatar'

function getAvatarImageSrc(logo: string | null, name: string) {
  if (logo) {
    return logo
  }

  const seed = name.trim() || '?'

  return `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(seed)}`
}

export function CommunityUiAvatar({
  community,
  size = 'lg',
}: {
  community: {
    logo: string | null
    name: string
  }
  size?: ComponentProps<typeof Avatar>['size']
}) {
  return (
    <Avatar size={size}>
      <AvatarImage alt={community.name} src={getAvatarImageSrc(community.logo, community.name)} />
      <AvatarFallback delay={300}>{community.name.trim()[0]?.toUpperCase() ?? '?'}</AvatarFallback>
    </Avatar>
  )
}
