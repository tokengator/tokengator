import type { ComponentProps } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@tokengator/ui/components/avatar'

type ProfileUiAvatarUser = {
  id?: string
  image?: string | null
  name: string
}

function getAvatarFallback(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return initials || '?'
}

export function ProfileUiAvatar({
  size = 'lg',
  user,
}: {
  size?: ComponentProps<typeof Avatar>['size']
  user: ProfileUiAvatarUser
}) {
  return (
    <Avatar size={size}>
      <AvatarImage alt={user.name} src={user.image ?? undefined} />
      <AvatarFallback delay={300}>{getAvatarFallback(user.name)}</AvatarFallback>
    </Avatar>
  )
}
