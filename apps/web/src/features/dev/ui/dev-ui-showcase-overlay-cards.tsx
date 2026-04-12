import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@tokengator/ui/components/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@tokengator/ui/components/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@tokengator/ui/components/dropdown-menu'
import { Input } from '@tokengator/ui/components/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@tokengator/ui/components/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@tokengator/ui/components/tabs'

import { DevUiShowcaseCard, DevUiShowcaseVariant } from './dev-ui-showcase-card'

export function DevUiShowcaseDialogCard() {
  return (
    <DevUiShowcaseCard description="Modal shells for forms, confirmations, and focused tasks." title="Dialog">
      <DevUiShowcaseVariant title="Default dialog">
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>Open dialog</DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create release</DialogTitle>
              <DialogDescription>
                Use dialogs for focused tasks that should interrupt the current flow.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Input defaultValue="v1.2.0" />
            </div>
            <DialogFooter className="border-t pt-3">
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button>Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DevUiShowcaseVariant>
      <DevUiShowcaseVariant title="Footer close button">
        <Dialog>
          <DialogTrigger render={<Button variant="secondary" />}>Compact dialog</DialogTrigger>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Sync preview</DialogTitle>
              <DialogDescription>Footer-level close actions work well for simpler confirmations.</DialogDescription>
            </DialogHeader>
            <DialogFooter className="border-t pt-3" showCloseButton>
              <Button>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}

export function DevUiShowcaseDropdownMenuCard() {
  const [includeArchived, setIncludeArchived] = useState(true)
  const [lastAction, setLastAction] = useState('None')
  const [theme, setTheme] = useState('system')

  return (
    <DevUiShowcaseCard description="Action menus with nested, checkbox, and radio items." title="Dropdown Menu">
      <DevUiShowcaseVariant
        description="Each item updates local state and fires a toast so the demo has visible behavior."
        title="Action menu"
      >
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button data-icon="inline-end" variant="outline" />}>
            Actions
            <ChevronDown />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Workspace</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setLastAction('New draft')
                  toast.info('New draft selected.')
                }}
              >
                New draft
                <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setLastAction('Open dashboard')
                  toast.info('Open dashboard selected.')
                }}
              >
                Open dashboard
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Invite</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  onClick={() => {
                    setLastAction('Invite by email')
                    toast.info('Invite by email selected.')
                  }}
                >
                  Email
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setLastAction('Invite by magic link')
                    toast.info('Invite by magic link selected.')
                  }}
                >
                  Magic link
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="text-muted-foreground text-xs">Last action: {lastAction}</div>
      </DevUiShowcaseVariant>
      <DevUiShowcaseVariant
        description="The current state is rendered below the trigger so checkbox and radio changes are obvious."
        title="Preferences menu"
      >
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button data-icon="inline-end" variant="secondary" />}>
            Preferences
            <ChevronDown />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuCheckboxItem
                checked={includeArchived}
                onCheckedChange={(checked) => setIncludeArchived(Boolean(checked))}
              >
                Include archived
              </DropdownMenuCheckboxItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              <DropdownMenuRadioGroup onValueChange={setTheme} value={theme}>
                <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="text-muted-foreground grid gap-1 text-xs">
          <div>Include archived: {includeArchived ? 'On' : 'Off'}</div>
          <div>Theme: {theme}</div>
        </div>
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}

export function DevUiShowcaseSelectCard() {
  const [defaultNetwork, setDefaultNetwork] = useState('mainnet')
  const [smallNetwork, setSmallNetwork] = useState('mainnet')

  return (
    <DevUiShowcaseCard description="Compact selects for filters, settings, and role pickers." title="Select">
      <DevUiShowcaseVariant
        description="The only built-in size change is trigger height: default is 28px (`h-7`), small is 24px (`h-6`)."
        title="Size comparison"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-1.5">
            <div className="text-muted-foreground text-xs">Default trigger</div>
            <Select
              onValueChange={(value) => {
                if (value) {
                  setDefaultNetwork(value)
                }
              }}
              value={defaultNetwork}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Network</SelectLabel>
                  <SelectItem value="devnet">Devnet</SelectItem>
                  <SelectItem value="mainnet">Mainnet</SelectItem>
                  <SelectSeparator />
                  <SelectItem value="testnet">Testnet</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <div className="text-muted-foreground text-xs">Small trigger</div>
            <Select
              onValueChange={(value) => {
                if (value) {
                  setSmallNetwork(value)
                }
              }}
              value={smallNetwork}
            >
              <SelectTrigger className="w-full" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Network</SelectLabel>
                  <SelectItem value="devnet">Devnet</SelectItem>
                  <SelectItem value="mainnet">Mainnet</SelectItem>
                  <SelectSeparator />
                  <SelectItem value="testnet">Testnet</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}

export function DevUiShowcaseSonnerCard() {
  return (
    <DevUiShowcaseCard
      description="Themed toast styling for app-wide feedback. The live toaster is already mounted in the root layout."
      title="Sonner"
    >
      <DevUiShowcaseVariant title="Toast actions">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              toast.success('Changes saved.')
            }}
            size="xs"
          >
            Success
          </Button>
          <Button
            onClick={() => {
              toast.info('Review required before deploy.')
            }}
            size="xs"
            variant="secondary"
          >
            Info
          </Button>
          <Button
            onClick={() => {
              toast.error('Sync failed.')
            }}
            size="xs"
            variant="destructive"
          >
            Error
          </Button>
          <Button
            onClick={() => {
              toast.loading('Syncing roles...', { duration: 2000 })
            }}
            size="xs"
            variant="outline"
          >
            Loading
          </Button>
        </div>
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}

export function DevUiShowcaseTabsCard() {
  const [lineTab, setLineTab] = useState('preview')
  const [surfaceTab, setSurfaceTab] = useState('overview')

  return (
    <DevUiShowcaseCard description="Horizontal tabs with surface and line variants." title="Tabs">
      <DevUiShowcaseVariant title="Default tabs">
        <Tabs onValueChange={setSurfaceTab} value={surfaceTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">Default tabs sit on a muted surface.</TabsContent>
          <TabsContent value="settings">Use them for section switching within a card or page.</TabsContent>
        </Tabs>
      </DevUiShowcaseVariant>
      <DevUiShowcaseVariant title="Line tabs">
        <Tabs onValueChange={setLineTab} value={lineTab}>
          <TabsList variant="line">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="source">Source</TabsTrigger>
          </TabsList>
          <TabsContent value="preview">Line tabs emphasize the active edge instead of the filled surface.</TabsContent>
          <TabsContent value="source">Useful for denser tool panels and developer views.</TabsContent>
        </Tabs>
      </DevUiShowcaseVariant>
    </DevUiShowcaseCard>
  )
}
