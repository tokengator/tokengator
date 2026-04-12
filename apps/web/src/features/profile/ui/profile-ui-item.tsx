import type { AppSessionUser } from '@/features/auth/data-access/get-app-auth-state'

import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@tokengator/ui/components/item'

import type { ReactNode } from 'react'
import { ProfileUiAvatar } from './profile-ui-avatar'

function getProfileMetadata(user: AppSessionUser) {
  return user.username ? `@${user.username}` : (user.role ?? 'user')
}

export function ProfileUiItem({ action, user }: { action?: ReactNode; user: AppSessionUser }) {
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
