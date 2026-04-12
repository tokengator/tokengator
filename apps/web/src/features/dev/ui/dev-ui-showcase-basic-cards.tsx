import { Check, MoreHorizontal, Plus } from 'lucide-react'
import { useState } from 'react'
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@tokengator/ui/components/avatar'
import { Button } from '@tokengator/ui/components/button'
import {
  Card as UiCard,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@tokengator/ui/components/card'
import { Checkbox } from '@tokengator/ui/components/checkbox'
import { Input } from '@tokengator/ui/components/input'
import { Label } from '@tokengator/ui/components/label'
import { Separator } from '@tokengator/ui/components/separator'
import { Skeleton } from '@tokengator/ui/components/skeleton'
import { Switch } from '@tokengator/ui/components/switch'

import { DevUiShowcaseCard, DevUiShowcaseVariant } from './dev-ui-showcase-card'

export function DevUiShowcaseAvatarCard() {
  return (
    <DevUiShowcaseCard description="Presence badges, grouped identities, and fallback-driven avatars." title="Avatar">
      <DevUiShowcaseVariant title="Sizes">
        <div className="flex flex-wrap items-center gap-3">
          <Avatar size="sm">
            <AvatarImage alt="TokenGator icon" src="/brand/icon.svg" />
          </Avatar>
          <Avatar>
            <AvatarFallback>TG</AvatarFallback>
            <AvatarBadge />
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>BT</AvatarFallback>
            <AvatarBadge>
              <Check />
            </AvatarBadge>
          </Avatar>
        </div>
      </DevUiShowcaseVariant>
      <DevUiShowcaseVariant title="Group">
        <AvatarGroup>
          <Avatar size="sm">
            <AvatarFallback>AL</AvatarFallback>
          </Avatar>
          <Avatar size="sm">
            <AvatarFallback>BM</AvatarFallback>
          </Avatar>
          <Avatar size="sm">
            <AvatarFallback>CK</AvatarFallback>
          </Avatar>
          <AvatarGroupCount>+4</AvatarGroupCount>
        </AvatarGroup>
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}

export function DevUiShowcaseButtonCard() {
  return (
    <DevUiShowcaseCard description="Action buttons with size and tone variants." title="Button">
      <DevUiShowcaseVariant title="Variants">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Default</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
        </div>
      </DevUiShowcaseVariant>
      <DevUiShowcaseVariant title="Sizes">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="default">Default</Button>
          <Button aria-label="Add item" size="icon">
            <Plus aria-hidden="true" />
          </Button>
          <Button size="lg">Large</Button>
          <Button size="sm">Small</Button>
          <Button size="xs">Tiny</Button>
        </div>
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}

export function DevUiShowcaseCardCard() {
  return (
    <DevUiShowcaseCard description="Surface containers for structured content and actions." title="Card">
      <DevUiShowcaseVariant title="Default card">
        <UiCard>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Cards hold a title, supporting copy, and primary actions.</CardDescription>
            <CardAction>
              <Button aria-label="More actions" size="icon-xs" variant="ghost">
                <MoreHorizontal aria-hidden="true" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Use the content slot for metrics, forms, or compact details.
          </CardContent>
          <CardFooter className="border-t">
            <Button size="xs" variant="outline">
              Secondary
            </Button>
          </CardFooter>
        </UiCard>
      </DevUiShowcaseVariant>
      <DevUiShowcaseVariant title="Compact card">
        <UiCard size="sm">
          <CardHeader>
            <CardTitle>Compact</CardTitle>
            <CardDescription>Smaller padding for dense admin layouts.</CardDescription>
          </CardHeader>
          <CardContent>Size=&quot;sm&quot; trims the spacing without changing the structure.</CardContent>
        </UiCard>
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}

export function DevUiShowcaseCheckboxCard() {
  const [alertsEnabled, setAlertsEnabled] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(false)

  return (
    <DevUiShowcaseCard description="Compact selection controls for forms and settings." title="Checkbox">
      <DevUiShowcaseVariant title="Interactive">
        <div className="grid gap-3">
          <label className="flex items-center gap-2">
            <Checkbox checked={alertsEnabled} onCheckedChange={(checked) => setAlertsEnabled(Boolean(checked))} />
            <span>Role alerts</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={weeklyDigest} onCheckedChange={(checked) => setWeeklyDigest(Boolean(checked))} />
            <span>Weekly digest</span>
          </label>
        </div>
      </DevUiShowcaseVariant>
      <DevUiShowcaseVariant title="Disabled">
        <label className="flex items-center gap-2 opacity-60">
          <Checkbox checked disabled />
          <span>Locked by workspace policy</span>
        </label>
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}

export function DevUiShowcaseInputCard() {
  return (
    <DevUiShowcaseCard description="Single-line text fields for filters, forms, and search." title="Input">
      <DevUiShowcaseVariant title="States">
        <div className="grid gap-2">
          <Input defaultValue="token-gated access" />
          <Input aria-invalid defaultValue="Needs a valid slug" />
          <Input disabled value="Disabled input" />
        </div>
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}

export function DevUiShowcaseLabelCard() {
  const [roleChangeAlerts, setRoleChangeAlerts] = useState(true)

  return (
    <DevUiShowcaseCard description="Accessible field labels that pair with inputs and toggles." title="Label">
      <DevUiShowcaseVariant title="Field label">
        <div className="grid gap-1.5">
          <Label htmlFor="dev-showcase-email">Release email</Label>
          <Input id="dev-showcase-email" value="team@tokengator.dev" />
        </div>
      </DevUiShowcaseVariant>
      <DevUiShowcaseVariant title="Toggle label">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={roleChangeAlerts}
            id="dev-showcase-checkbox"
            onCheckedChange={(checked) => setRoleChangeAlerts(Boolean(checked))}
          />
          <Label htmlFor="dev-showcase-checkbox">Send role-change alerts</Label>
        </div>
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}

export function DevUiShowcaseSeparatorCard() {
  return (
    <DevUiShowcaseCard description="Subtle dividers for stacked and inline content." title="Separator">
      <DevUiShowcaseVariant title="Horizontal">
        <div className="grid gap-2">
          <div>Overview</div>
          <Separator />
          <div>Members</div>
        </div>
      </DevUiShowcaseVariant>
      <DevUiShowcaseVariant title="Vertical">
        <div className="flex h-8 items-center gap-3">
          <span>List</span>
          <Separator orientation="vertical" />
          <span>Split</span>
          <Separator orientation="vertical" />
          <span>Table</span>
        </div>
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}

export function DevUiShowcaseSkeletonCard() {
  return (
    <DevUiShowcaseCard description="Loading placeholders sized to the final layout." title="Skeleton">
      <DevUiShowcaseVariant title="Profile loading">
        <div className="grid gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-20 w-full" />
        </div>
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}

export function DevUiShowcaseSwitchCard() {
  const [compactMode, setCompactMode] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  return (
    <DevUiShowcaseCard description="Binary toggles with compact and default sizes." title="Switch">
      <DevUiShowcaseVariant title="Sizes">
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="dev-showcase-notifications">Notifications</Label>
            <Switch
              checked={notificationsEnabled}
              id="dev-showcase-notifications"
              onCheckedChange={setNotificationsEnabled}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="dev-showcase-compact">Compact mode</Label>
            <Switch checked={compactMode} id="dev-showcase-compact" onCheckedChange={setCompactMode} size="sm" />
          </div>
        </div>
      </DevUiShowcaseVariant>
      <DevUiShowcaseVariant title="Disabled">
        <div className="flex items-center justify-between gap-3 opacity-60">
          <span>Managed by organization defaults</span>
          <Switch checked disabled />
        </div>
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}
