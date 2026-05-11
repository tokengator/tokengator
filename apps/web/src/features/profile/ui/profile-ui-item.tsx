import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@tokengator/ui/components/item'

import { LockIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { ProfileUiAvatar } from './profile-ui-avatar'

type ProfileUiItemUser = {
  id?: string
  image?: string | null
  name: string
  private?: boolean | null
  role?: string | null
  username?: string | null
}

function getProfileMetadata(user: ProfileUiItemUser) {
  return user.username ? `@${user.username}` : (user.role ?? 'user')
}

export function ProfileUiItem({
  action,
  className,
  user,
  variant = 'outline',
}: {
  action?: ReactNode
  className?: string
  user: ProfileUiItemUser
  variant?: 'default' | 'muted' | 'outline'
}) {
  return (
    <Item className={className} variant={variant}>
      <ItemMedia>
        <ProfileUiAvatar user={user} />
      </ItemMedia>
      <ItemContent className="gap-0.5">
        <ItemTitle className="items-start gap-1.5 text-lg leading-none">
          {user.name}
          {user.private ? (
            <LockIcon
              aria-label="Private profile"
              className="text-muted-foreground size-3 shrink-0 translate-y-0.5"
              role="img"
            />
          ) : null}
        </ItemTitle>
        <ItemDescription className="leading-none">{getProfileMetadata(user)}</ItemDescription>
      </ItemContent>
      {action ? <ItemActions>{action}</ItemActions> : null}
    </Item>
  )
}
