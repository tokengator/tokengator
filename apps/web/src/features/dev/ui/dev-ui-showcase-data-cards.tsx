import { useState } from 'react'

import { Button } from '@tokengator/ui/components/button'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from '@tokengator/ui/components/item'
import { UiDebug } from '@tokengator/ui/components/ui-debug'
import { UiDetailRow } from '@tokengator/ui/components/ui-detail-row'
import {
  UiFacetFilter,
  UiFacetFilterPanel,
  type UiFacetFilterGroup,
  type UiFacetFilterSelection,
} from '@tokengator/ui/components/ui-facet-filter'
import {
  UiInfoCard,
  UiInfoCardError,
  UiInfoCardLabel,
  UiInfoCardMeta,
  UiInfoCardValue,
} from '@tokengator/ui/components/ui-info-card'
import { UiListCard, UiListCardHeader, UiListCardMeta } from '@tokengator/ui/components/ui-list-card'
import { UiStatus } from '@tokengator/ui/components/ui-status'
import {
  UiTable,
  UiTableBody,
  UiTableCell,
  UiTableHead,
  UiTableHeaderCell,
  UiTableRow,
} from '@tokengator/ui/components/ui-table'
import { UiTextCopyIcon } from '@tokengator/ui/components/ui-text-copy-icon'

import { DevUiShowcaseCard, DevUiShowcaseVariant } from './dev-ui-showcase-card'

const devUiFacetFilterGroups: UiFacetFilterGroup[] = [
  {
    id: 'accessories',
    label: 'Accessories',
    meta: 17,
    options: [
      { label: 'Bandana', meta: 11, value: 'bandana' },
      { label: 'Bow', meta: 18, value: 'bow' },
      { label: 'Crown', meta: 9, value: 'crown' },
      { label: 'Earrings', meta: 13, value: 'earrings' },
      { label: 'Glasses', meta: 22, value: 'glasses' },
      { label: 'Hat', meta: 27, value: 'hat' },
    ],
  },
  {
    id: 'animal',
    label: 'Animal',
    meta: 12,
    options: [
      { label: 'Bear', meta: 31, value: 'bear' },
      { label: 'Cat', meta: 24, value: 'cat' },
      { label: 'Dog', meta: 18, value: 'dog' },
      { label: 'Frog', meta: 16, value: 'frog' },
      { label: 'Penguin', meta: 12, value: 'penguin' },
      { label: 'Rabbit', meta: 20, value: 'rabbit' },
    ],
  },
  {
    id: 'background',
    label: 'Background',
    meta: 12,
    options: [
      { label: 'Aurora', meta: 10, value: 'aurora' },
      { label: 'City', meta: 14, value: 'city' },
      { label: 'Desert', meta: 11, value: 'desert' },
      { label: 'Forest', meta: 26, value: 'forest' },
      { label: 'Night', meta: 18, value: 'night' },
      { label: 'Ocean', meta: 16, value: 'ocean' },
    ],
  },
  {
    id: 'colour',
    label: 'Colour',
    meta: 17,
    options: [
      { label: 'Black', meta: 46, value: 'black' },
      { label: 'Blue', meta: 48, value: 'blue' },
      { label: 'Bone', meta: 24, value: 'bone' },
      { label: 'Brown', meta: 56, value: 'brown' },
      { label: 'Green', meta: 58, value: 'green' },
      { label: 'Orange', meta: 48, value: 'orange' },
      { label: 'Pink', meta: 65, value: 'pink' },
      { label: 'Purple', meta: 61, value: 'purple' },
      { label: 'Red', meta: 67, value: 'red' },
      { label: 'Sesame', meta: 12, value: 'sesame' },
      { label: 'Snow', meta: 12, value: 'snow' },
    ],
  },
  {
    id: 'one-of-one',
    label: 'One of One',
    meta: 4,
    options: [
      { label: 'Founder', meta: 1, value: 'founder' },
      { label: 'Glitch', meta: 1, value: 'glitch' },
      { label: 'Golden', meta: 1, value: 'golden' },
      { label: 'Mythic', meta: 1, value: 'mythic' },
    ],
  },
]

const devUiFacetFilterInitialDropdownSelection: UiFacetFilterSelection = {
  accessories: ['glasses'],
  colour: ['pink', 'purple'],
}

const devUiFacetFilterInitialPanelSelection: UiFacetFilterSelection = {
  animal: ['cat'],
  'one-of-one': ['glitch'],
}

export function DevUiShowcaseItemCard() {
  return (
    <DevUiShowcaseCard description="Composed list rows with media, actions, and metadata." title="Item">
      <DevUiShowcaseVariant title="Structured list">
        <ItemGroup>
          <Item variant="outline">
            <ItemMedia variant="image">
              <img alt="TokenGator icon" src="/brand/icon.svg" />
            </ItemMedia>
            <ItemContent>
              <ItemHeader>
                <ItemTitle>TokenGator</ItemTitle>
                <ItemActions>
                  <Button size="xs" variant="ghost">
                    Open
                  </Button>
                </ItemActions>
              </ItemHeader>
              <ItemDescription>
                Manage token-gated access, Discord sync, and admin operations from one view.
              </ItemDescription>
              <ItemFooter className="text-muted-foreground text-xs">
                <span>Updated just now</span>
              </ItemFooter>
            </ItemContent>
          </Item>
          <ItemSeparator />
          <Item size="xs" variant="muted">
            <ItemContent>
              <ItemTitle>Compact row</ItemTitle>
              <ItemDescription>Use the smaller size inside denser menus and tables.</ItemDescription>
            </ItemContent>
          </Item>
        </ItemGroup>
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}

export function DevUiShowcaseUiDebugCard() {
  return (
    <DevUiShowcaseCard description="Tiny debug preblocks for structured data inspection." title="UI Debug">
      <DevUiShowcaseVariant title="Structured data">
        <UiDebug
          className="bg-muted/50 max-h-36 rounded-md p-2"
          data={{
            component: 'UiDebug',
            route: '/dev/ui',
            states: ['mounted', 'visible'],
          }}
        />
      </DevUiShowcaseVariant>
      <DevUiShowcaseVariant title="Plain string">
        <UiDebug className="bg-muted/50 rounded-md p-2" data="Plain text also renders without serialization." />
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}

export function DevUiShowcaseUiDetailRowCard() {
  return (
    <DevUiShowcaseCard description="Label-value rows for compact entity details." title="UI Detail Row">
      <DevUiShowcaseVariant title="Default alignment">
        <div className="grid gap-2">
          <UiDetailRow label="Environment">Production</UiDetailRow>
          <UiDetailRow label="Organization">TokenGator</UiDetailRow>
        </div>
      </DevUiShowcaseVariant>
      <DevUiShowcaseVariant title="Centered alignment">
        <UiDetailRow align="center" label="Status">
          <UiStatus tone="success">healthy</UiStatus>
        </UiDetailRow>
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}

export function DevUiShowcaseUiFacetFilterCard() {
  const [dropdownSelection, setDropdownSelection] = useState(devUiFacetFilterInitialDropdownSelection)
  const [panelSelection, setPanelSelection] = useState(devUiFacetFilterInitialPanelSelection)

  return (
    <DevUiShowcaseCard
      description="Faceted multi-select filters with grouped values, caller-supplied metadata, and built-in search."
      title="UI Facet Filter"
    >
      <DevUiShowcaseVariant
        description="The composed control keeps the trigger compact and opens a fixed-width facet panel."
        title="Dropdown control"
      >
        <div className="grid gap-3">
          <div>
            <UiFacetFilter
              groups={devUiFacetFilterGroups}
              label="Facet"
              onSelectedValuesChange={setDropdownSelection}
              selectedValues={dropdownSelection}
            />
          </div>
          <UiDebug className="bg-muted/50 max-h-32 rounded-md p-2" data={dropdownSelection} />
        </div>
      </DevUiShowcaseVariant>
      <DevUiShowcaseVariant
        description="The panel primitive can be embedded directly when the surrounding overlay is owned elsewhere."
        title="Panel primitive"
      >
        <div className="grid gap-3">
          <UiFacetFilterPanel
            className="w-full"
            defaultExpandedGroupIds={['colour', 'one-of-one']}
            groups={devUiFacetFilterGroups}
            label="Facet"
            onSelectedValuesChange={setPanelSelection}
            selectedValues={panelSelection}
          />
          <UiDebug className="bg-muted/50 max-h-32 rounded-md p-2" data={panelSelection} />
        </div>
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}

export function DevUiShowcaseUiInfoCardCard() {
  return (
    <DevUiShowcaseCard description="Small metric cards for stats, freshness, and health states." title="UI Info Card">
      <DevUiShowcaseVariant title="Metric card">
        <UiInfoCard className="grid gap-2">
          <UiInfoCardLabel>Freshness</UiInfoCardLabel>
          <UiInfoCardValue>
            <UiStatus tone="success">fresh</UiStatus>
          </UiInfoCardValue>
          <UiInfoCardMeta>Last success 3 minutes ago</UiInfoCardMeta>
        </UiInfoCard>
      </DevUiShowcaseVariant>
      <DevUiShowcaseVariant title="Error state">
        <UiInfoCard className="grid gap-2">
          <UiInfoCardLabel>Last run</UiInfoCardLabel>
          <UiInfoCardValue>failed</UiInfoCardValue>
          <UiInfoCardError>Discord guild fetch timed out.</UiInfoCardError>
        </UiInfoCard>
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}

export function DevUiShowcaseUiListCardCard() {
  return (
    <DevUiShowcaseCard description="Simple bordered cards for stacked list content." title="UI List Card">
      <DevUiShowcaseVariant title="List items">
        <div className="grid gap-2">
          <UiListCard>
            <UiListCardHeader>
              <div className="font-medium">Primary wallet</div>
              <UiListCardMeta>active</UiListCardMeta>
            </UiListCardHeader>
            <div className="font-mono text-xs">7vQx...6n3a</div>
          </UiListCard>
          <UiListCard>
            <UiListCardHeader>
              <div className="font-medium">Discord identity</div>
              <UiListCardMeta>linked</UiListCardMeta>
            </UiListCardHeader>
            <div className="text-muted-foreground text-xs">@beeman</div>
          </UiListCard>
        </div>
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}

export function DevUiShowcaseUiStatusCard() {
  return (
    <DevUiShowcaseCard description="Inline status pills with tone and casing variants." title="UI Status">
      <DevUiShowcaseVariant title="Tones">
        <div className="flex flex-wrap gap-2">
          <UiStatus>default</UiStatus>
          <UiStatus tone="destructive">destructive</UiStatus>
          <UiStatus tone="neutral">neutral</UiStatus>
          <UiStatus tone="notice">notice</UiStatus>
          <UiStatus tone="success">success</UiStatus>
          <UiStatus tone="warning">warning</UiStatus>
        </div>
      </DevUiShowcaseVariant>
      <DevUiShowcaseVariant title="Casing">
        <UiStatus casing="uppercase" tone="success">
          synced
        </UiStatus>
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}

export function DevUiShowcaseUiTableCard() {
  return (
    <DevUiShowcaseCard description="Bordered tables for structured admin data and action-heavy lists." title="UI Table">
      <DevUiShowcaseVariant title="Basic table">
        <UiTable containerClassName="rounded-md">
          <UiTableHead>
            <UiTableRow>
              <UiTableHeaderCell>Label</UiTableHeaderCell>
              <UiTableHeaderCell>Status</UiTableHeaderCell>
              <UiTableHeaderCell>Owner</UiTableHeaderCell>
            </UiTableRow>
          </UiTableHead>
          <UiTableBody>
            <UiTableRow>
              <UiTableCell>Founders Pass</UiTableCell>
              <UiTableCell>enabled</UiTableCell>
              <UiTableCell>TokenGator</UiTableCell>
            </UiTableRow>
            <UiTableRow>
              <UiTableCell>Beta Access</UiTableCell>
              <UiTableCell>disabled</UiTableCell>
              <UiTableCell>Core Team</UiTableCell>
            </UiTableRow>
          </UiTableBody>
        </UiTable>
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}

export function DevUiShowcaseUiTextCopyIconCard() {
  return (
    <DevUiShowcaseCard
      description="Tiny clipboard actions for copyable identifiers and addresses."
      title="UI Text Copy Icon"
    >
      <DevUiShowcaseVariant title="Copy affordance">
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
            <span className="font-mono text-xs">7vQx...6n3a</span>
            <UiTextCopyIcon text="7vQxW1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9" toast="Wallet copied." />
          </div>
          <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
            <span className="font-mono text-xs">community_01</span>
            <UiTextCopyIcon text="community_01" toast="Community ID copied." />
          </div>
        </div>
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}
