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
        <ItemTitle className="mb-0.5 text-lg leading-none">{user.name}</ItemTitle>
        <ItemDescription className="leading-none">{getProfileMetadata(user)}</ItemDescription>
      </ItemContent>
      {action ? <ItemActions>{action}</ItemActions> : null}
    </Item>
  )
}
