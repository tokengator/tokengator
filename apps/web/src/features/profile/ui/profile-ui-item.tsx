import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@tokengator/ui/components/item'

import type { ReactNode } from 'react'
import { ProfileUiAvatar } from './profile-ui-avatar'

type ProfileUiItemUser = {
  id?: string
  image?: string | null
  name: string
  role?: string | null
  username?: string | null
}

function getProfileMetadata(user: ProfileUiItemUser) {
  return user.username ? `@${user.username}` : (user.role ?? 'user')
}

export function ProfileUiItem({ action, user }: { action?: ReactNode; user: ProfileUiItemUser }) {
  return (
    <Item variant="outline">
      <ItemMedia>
        <ProfileUiAvatar user={user} />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{user.name}</ItemTitle>
        <ItemDescription>{getProfileMetadata(user)}</ItemDescription>
      </ItemContent>
      {action ? <ItemActions>{action}</ItemActions> : null}
    </Item>
  )
}
