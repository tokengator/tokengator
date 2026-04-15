import { Link } from '@tanstack/react-router'
import type {
  ProfileCommunityAssetRoleEntity,
  ProfileCommunityAssetRoleGroupEntity,
  ProfileCommunityCollectionAssetEntity,
  ProfileCommunityMembershipEntity,
  ProfileCommunityMintAccountEntity,
} from '@tokengator/sdk'

import { CommunityUiAvatar } from '@/features/community/ui/community-ui-avatar'

import { Badge } from '@tokengator/ui/components/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@tokengator/ui/components/hover-card'

interface ProfileUiCommunitiesCardProps {
  communities: ProfileCommunityMembershipEntity[]
  isPending?: boolean
}

const assetGroupTypeOrder = {
  collection: 0,
  mint: 1,
} as const

function formatCommunityRole(role: string) {
  return role.replaceAll('-', ' ')
}

function getCollectionAssetTitle(asset: ProfileCommunityCollectionAssetEntity) {
  return asset.metadataName?.trim() || asset.address
}

function getCollectionAssetTraitLabel(trait: ProfileCommunityCollectionAssetEntity['traits'][number]) {
  return `${trait.groupLabel}: ${trait.valueLabel}`
}

function getCollectionAssetTraitLabels(asset: ProfileCommunityCollectionAssetEntity) {
  return asset.traits.map((trait) => getCollectionAssetTraitLabel(trait))
}

function sortAssetGroups(assetGroups: ProfileCommunityAssetRoleGroupEntity[]) {
  return [...assetGroups].sort(
    (left, right) =>
      assetGroupTypeOrder[left.type] - assetGroupTypeOrder[right.type] ||
      left.label.localeCompare(right.label) ||
      left.address.localeCompare(right.address) ||
      left.id.localeCompare(right.id),
  )
}

function sortAssetRoles(assetRoles: ProfileCommunityAssetRoleEntity[]) {
  return [...assetRoles].sort(
    (left, right) =>
      left.name.localeCompare(right.name) || left.slug.localeCompare(right.slug) || left.id.localeCompare(right.id),
  )
}

function ProfileUiCollectionAssetTile({ asset }: { asset: ProfileCommunityCollectionAssetEntity }) {
  const title = getCollectionAssetTitle(asset)
  const traitLabels = getCollectionAssetTraitLabels(asset)

  return (
    <HoverCard>
      <HoverCardTrigger
        aria-label={traitLabels.length ? `${title}. ${traitLabels.join(', ')}` : `${title}. No traits`}
        className="bg-card hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-ring/50 grid min-w-0 cursor-pointer overflow-hidden rounded-md border text-left transition-colors outline-none focus-visible:ring-[3px]"
        render={<button type="button" />}
      >
        <div className="bg-muted aspect-square overflow-hidden">
          {asset.metadataImageUrl ? (
            <img alt={title} className="size-full object-cover" loading="lazy" src={asset.metadataImageUrl} />
          ) : (
            <div aria-label={`${title} image placeholder`} className="size-full" role="img" />
          )}
        </div>
        <div className="min-w-0 px-2 py-2">
          <div className="truncate text-sm font-medium">{title}</div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="grid gap-3">
        <div className="font-medium">{title}</div>
        {traitLabels.length ? (
          <div className="flex flex-wrap gap-1">
            {asset.traits.map((trait) => (
              <Badge key={`${trait.groupId}:${trait.value}`} variant="outline">
                {getCollectionAssetTraitLabel(trait)}
              </Badge>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground text-xs">No traits</div>
        )}
      </HoverCardContent>
    </HoverCard>
  )
}

function ProfileUiMintAccountRow({ account, index }: { account: ProfileCommunityMintAccountEntity; index: number }) {
  return (
    <div className="grid gap-1 text-sm">
      <div className="text-muted-foreground text-xs">Wallet holding {index + 1}</div>
      <div className="min-w-0 truncate font-mono text-xs">{account.owner}</div>
      <div className="text-muted-foreground flex flex-wrap gap-x-2 gap-y-1 text-xs">
        <span>Raw amount</span>
        <span className="text-foreground font-mono">{account.amount}</span>
      </div>
    </div>
  )
}

function ProfileUiCommunityRoleAssetGroup({
  assetGroup,
  communitySlug,
}: {
  assetGroup: ProfileCommunityAssetRoleGroupEntity
  communitySlug: string
}) {
  const heading = (
    <>
      {assetGroup.imageUrl ? (
        <img
          alt={assetGroup.label}
          className="bg-muted size-10 rounded-md border object-cover"
          loading="lazy"
          src={assetGroup.imageUrl}
        />
      ) : (
        <div
          aria-label={`${assetGroup.label} image placeholder`}
          className="bg-muted size-10 rounded-md border"
          role="img"
        />
      )}
      <div className="min-w-0">
        <div className="truncate font-medium">
          {assetGroup.type === 'collection' ? 'Collection' : 'Mint'}: {assetGroup.label}
        </div>
        <div className="text-muted-foreground truncate font-mono text-[0.7rem]">{assetGroup.address}</div>
      </div>
    </>
  )

  return (
    <div className="grid gap-3 border-t pt-4 first:border-t-0 first:pt-0">
      {assetGroup.type === 'collection' ? (
        <Link
          className="hover:text-primary mb-3 flex min-w-0 items-center gap-3 transition-colors"
          params={{
            address: assetGroup.address,
            slug: communitySlug,
          }}
          search={{
            facets: undefined,
            grid: 8,
            owner: undefined,
            query: undefined,
          }}
          to="/communities/$slug/collections/$address"
        >
          {heading}
        </Link>
      ) : (
        <div className="mb-3 flex min-w-0 items-center gap-3">{heading}</div>
      )}

      {assetGroup.type === 'collection' ? (
        assetGroup.ownedAssets.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {assetGroup.ownedAssets.map((asset) => (
              <ProfileUiCollectionAssetTile asset={asset} key={asset.id} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Nothing here</p>
        )
      ) : assetGroup.ownedAccounts.length ? (
        <div className="grid gap-3">
          <div className="grid gap-1 text-sm">
            <span className="text-muted-foreground text-xs">Raw total amount</span>
            <span className="font-mono text-sm font-medium break-all">{assetGroup.ownedAmount}</span>
          </div>
          <div className="grid gap-3">
            {assetGroup.ownedAccounts.map((account, index) => (
              <ProfileUiMintAccountRow account={account} index={index} key={account.id} />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Nothing here</p>
      )}
    </div>
  )
}

function ProfileUiCommunityAssetRole({
  assetRole,
  communitySlug,
}: {
  assetRole: ProfileCommunityAssetRoleEntity
  communitySlug: string
}) {
  const sortedAssetGroups = sortAssetGroups(assetRole.assetGroups)

  return (
    <div className="grid gap-4 border-t pt-4 first:border-t-0 first:pt-0">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-muted-foreground text-xs">Role</span>
          <Badge className="max-w-full truncate" variant="secondary">
            {assetRole.name}
          </Badge>
        </div>
      </div>
      {sortedAssetGroups.length ? (
        sortedAssetGroups.map((assetGroup) => (
          <ProfileUiCommunityRoleAssetGroup
            assetGroup={assetGroup}
            communitySlug={communitySlug}
            key={`${assetRole.id}:${assetGroup.id}`}
          />
        ))
      ) : (
        <p className="text-muted-foreground text-sm">No assets found for this role.</p>
      )}
    </div>
  )
}

function ProfileUiCommunityAssetCard({ community }: { community: ProfileCommunityMembershipEntity }) {
  const sortedAssetRoles = sortAssetRoles(community.assetRoles)

  return (
    <Card>
      <CardHeader className="grid-cols-[minmax(0,1fr)_auto] items-center">
        <Link
          className="hover:text-primary grid min-w-0 grid-cols-[auto_1fr] items-center gap-3 transition-colors"
          params={{ slug: community.slug }}
          to="/communities/$slug"
        >
          <CommunityUiAvatar community={community} />
          <div className="min-w-0">
            <CardTitle className="truncate">{community.name}</CardTitle>
            <CardDescription className="truncate">@{community.slug}</CardDescription>
          </div>
        </Link>
        <div className="text-muted-foreground text-xs capitalize">{formatCommunityRole(community.role)}</div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {sortedAssetRoles.length ? (
          sortedAssetRoles.map((assetRole) => (
            <ProfileUiCommunityAssetRole assetRole={assetRole} communitySlug={community.slug} key={assetRole.id} />
          ))
        ) : (
          <p className="text-muted-foreground text-sm">No asset-backed roles yet.</p>
        )}
      </CardContent>
    </Card>
  )
}

export function ProfileUiCommunitiesCard({ communities, isPending = false }: ProfileUiCommunitiesCardProps) {
  return (
    <div className="grid gap-4">
      {isPending ? (
        <Card>
          <CardContent>
            <p className="text-muted-foreground text-sm">Loading communities...</p>
          </CardContent>
        </Card>
      ) : null}
      {!isPending && communities.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-muted-foreground text-sm">No communities yet.</p>
          </CardContent>
        </Card>
      ) : null}
      {!isPending
        ? communities.map((community) => <ProfileUiCommunityAssetCard community={community} key={community.id} />)
        : null}
    </div>
  )
}
