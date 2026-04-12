import type { ComponentProps, ReactNode } from 'react'

import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from '@tokengator/ui/components/item'

import { CommunityUiAvatar } from './community-ui-avatar'

export function CommunityUiItem({
  action,
  community,
  footer,
  meta,
  title,
  variant = 'outline',
}: {
  action?: ReactNode
  community: {
    logo: string | null
    name: string
    slug: string
  }
  footer?: ReactNode
  meta?: ReactNode
  title?: ReactNode
  variant?: ComponentProps<typeof Item>['variant']
}) {
  return (
    <Item variant={variant}>
      <ItemMedia>
        <CommunityUiAvatar community={community} />
      </ItemMedia>
      <ItemContent className="min-w-0">
        {meta ? (
          <ItemHeader className="w-full items-start">
            <ItemTitle className="min-w-0">{title ?? community.name}</ItemTitle>
            <div className="text-muted-foreground shrink-0 text-xs">{meta}</div>
          </ItemHeader>
        ) : (
          <ItemTitle className="min-w-0">{title ?? community.name}</ItemTitle>
        )}
        <ItemDescription>@{community.slug}</ItemDescription>
        {footer ? <ItemFooter className="w-full justify-start">{footer}</ItemFooter> : null}
      </ItemContent>
      {action ? <ItemActions>{action}</ItemActions> : null}
    </Item>
  )
}
