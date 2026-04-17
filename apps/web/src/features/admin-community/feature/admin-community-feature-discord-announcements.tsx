import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@tokengator/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { Label } from '@tokengator/ui/components/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@tokengator/ui/components/select'
import { Switch } from '@tokengator/ui/components/switch'
import { UiStatus, type UiStatusVariants } from '@tokengator/ui/components/ui-status'

import { useAdminCommunityDiscordAnnouncementCatalogQuery } from '../data-access/use-admin-community-discord-announcement-catalog-query'
import { useAdminCommunityDiscordAnnouncementChannelTest } from '../data-access/use-admin-community-discord-announcement-channel-test'
import { useAdminCommunityDiscordAnnouncementConfigUpsert } from '../data-access/use-admin-community-discord-announcement-config-upsert'
import { useAdminCommunityDiscordAnnouncementEnabledSet } from '../data-access/use-admin-community-discord-announcement-enabled-set'
import { formatAdminCommunityDiscordCheck } from '../util/admin-community-discord-check'

const unselectedChannelValue = '__unselected__'

function getDiscordAnnouncementStatusTone(status: 'needs_attention' | 'not_configured' | 'ready', enabled: boolean) {
  const toneByStatus = {
    needs_attention: 'warning',
    not_configured: 'default',
    ready: enabled ? 'success' : 'default',
  } satisfies Record<typeof status, UiStatusVariants['tone']>

  return toneByStatus[status]
}

interface AdminCommunityFeatureDiscordAnnouncementsProps {
  organizationId: string
}

export function AdminCommunityFeatureDiscordAnnouncements(props: AdminCommunityFeatureDiscordAnnouncementsProps) {
  const { organizationId } = props
  const announcementCatalog = useAdminCommunityDiscordAnnouncementCatalogQuery(organizationId)
  const testDiscordAnnouncementChannel = useAdminCommunityDiscordAnnouncementChannelTest()
  const setDiscordAnnouncementEnabled = useAdminCommunityDiscordAnnouncementEnabledSet(organizationId)
  const upsertDiscordAnnouncementConfig = useAdminCommunityDiscordAnnouncementConfigUpsert(organizationId)
  const [savedChannelConfigsByType, setSavedChannelConfigsByType] = useState<
    Record<string, { channelId: string | null; channelName: string | null }>
  >({})
  const [draftChannelIdsByType, setDraftChannelIdsByType] = useState<Record<string, string>>({})
  const catalog = announcementCatalog.data
  const connectionDiagnostics = (catalog?.connection?.diagnostics.checks ?? []).map((check) =>
    formatAdminCommunityDiscordCheck(check),
  )

  function getChannelDraft(type: string, savedChannelId: string | null) {
    return draftChannelIdsByType[type] ?? savedChannelId ?? ''
  }

  function setChannelDraft(type: string, value: string) {
    setDraftChannelIdsByType((currentValue) => ({
      ...currentValue,
      [type]: value,
    }))
  }

  async function handleSaveChannel(input: { channelId: string; type: string }) {
    try {
      await upsertDiscordAnnouncementConfig.mutateAsync({
        channelId: input.channelId,
        organizationId,
        type: input.type as 'role_updates',
      })
      const selectedChannel = catalog?.channels.find((channel) => channel.id === input.channelId) ?? null

      setSavedChannelConfigsByType((currentValue) => ({
        ...currentValue,
        [input.type]: {
          channelId: input.channelId,
          channelName: selectedChannel?.name ?? null,
        },
      }))
      setDraftChannelIdsByType((currentValue) => ({
        ...currentValue,
        [input.type]: input.channelId,
      }))
    } catch {}
  }

  function handleEnabledChange(input: { enabled: boolean; type: string }) {
    setDiscordAnnouncementEnabled.mutate({
      enabled: input.enabled,
      organizationId,
      type: input.type as 'role_updates',
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discord Announcements</CardTitle>
        <CardDescription>
          Choose which Discord events should post messages and which channel should receive them.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {announcementCatalog.isPending ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading Discord announcement options...
          </div>
        ) : null}
        {announcementCatalog.error ? (
          <div className="text-destructive text-sm">Failed to load Discord announcement settings.</div>
        ) : null}
        {connectionDiagnostics.length ? (
          <div className="grid gap-2 rounded-lg border p-3">
            <div className="text-sm font-medium">Channel Diagnostics</div>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {connectionDiagnostics.map((diagnostic) => (
                <li key={diagnostic}>{diagnostic}</li>
              ))}
            </ol>
          </div>
        ) : null}
        {!announcementCatalog.isPending && catalog && catalog.channels.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No text or announcement channels are currently postable by the bot in this server.
          </p>
        ) : null}
        {catalog?.configs.map((config) => {
          const savedChannelConfig = savedChannelConfigsByType[config.type]
          const savedChannelId = savedChannelConfig?.channelId ?? config.channelId
          const savedChannelName = savedChannelConfig?.channelName ?? config.channelName
          const channelDraft = getChannelDraft(config.type, savedChannelId)
          const currentChannelLabel =
            savedChannelName ?? (savedChannelId ? `Missing channel (${savedChannelId})` : 'No channel selected')
          const diagnostics = config.checks.map((check) => formatAdminCommunityDiscordCheck(check))
          const draftIsDirty = channelDraft !== (savedChannelId ?? '')
          const isTogglePending =
            setDiscordAnnouncementEnabled.isPending && setDiscordAnnouncementEnabled.variables?.type === config.type
          const isTestPending =
            testDiscordAnnouncementChannel.isPending && testDiscordAnnouncementChannel.variables?.type === config.type
          const isUpsertPending =
            upsertDiscordAnnouncementConfig.isPending && upsertDiscordAnnouncementConfig.variables?.type === config.type
          const missingChannelOption =
            savedChannelId && !catalog.channels.some((channel) => channel.id === savedChannelId)
              ? {
                  id: savedChannelId,
                  label: currentChannelLabel,
                }
              : null
          const selectedChannelIsPostable = catalog.channels.some((channel) => channel.id === channelDraft)

          return (
            <div className="grid gap-4 rounded-lg border p-4" key={config.type}>
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="grid gap-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{config.label}</div>
                    <UiStatus tone={getDiscordAnnouncementStatusTone(config.status, config.enabled)}>
                      {config.status === 'ready'
                        ? config.enabled
                          ? 'Ready'
                          : 'Disabled'
                        : config.status === 'needs_attention'
                          ? 'Needs attention'
                          : 'Not configured'}
                    </UiStatus>
                  </div>
                  <p className="text-muted-foreground text-sm">{config.description}</p>
                </div>
                {config.status !== 'not_configured' ? (
                  <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
                    <Label className="text-sm" htmlFor={`discord-announcement-enabled-${config.type}`}>
                      Enabled
                    </Label>
                    <Switch
                      checked={config.enabled}
                      disabled={isTogglePending}
                      id={`discord-announcement-enabled-${config.type}`}
                      onCheckedChange={(enabled) => handleEnabledChange({ enabled, type: config.type })}
                    />
                  </div>
                ) : null}
              </div>
              <div className="grid gap-1.5">
                <Label id={`discord-announcement-channel-${config.type}-label`}>
                  {config.status === 'not_configured' ? 'Announcement channel' : 'Change channel'}
                </Label>
                <Select
                  disabled={isUpsertPending || catalog.channels.length === 0}
                  onValueChange={(value) => {
                    if (value == null) {
                      return
                    }

                    setChannelDraft(config.type, value === unselectedChannelValue ? '' : value)
                  }}
                  value={channelDraft || unselectedChannelValue}
                >
                  <SelectTrigger
                    aria-labelledby={`discord-announcement-channel-${config.type}-label`}
                    className="w-full"
                    id={`discord-announcement-channel-${config.type}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={unselectedChannelValue}>Select a channel</SelectItem>
                    {missingChannelOption ? (
                      <SelectItem value={missingChannelOption.id}>{missingChannelOption.label}</SelectItem>
                    ) : null}
                    {catalog.channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {`#${channel.name} · ${channel.type}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {config.status !== 'not_configured' ? (
                <div className="text-muted-foreground text-sm">Current channel: {currentChannelLabel}</div>
              ) : null}
              {diagnostics.length ? (
                <div className="grid gap-1">
                  <div className="font-medium">Announcement Diagnostics</div>
                  <ol className="list-decimal space-y-1 pl-5 text-xs">
                    {diagnostics.map((diagnostic) => (
                      <li key={`${config.type}-${diagnostic}`}>{diagnostic}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button
                  disabled={isTestPending || isUpsertPending || !selectedChannelIsPostable}
                  onClick={() =>
                    testDiscordAnnouncementChannel.mutate({
                      channelId: channelDraft,
                      organizationId,
                      type: config.type as 'role_updates',
                    })
                  }
                  type="button"
                  variant="outline"
                >
                  {isTestPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Sending Test
                    </>
                  ) : (
                    'Test Channel'
                  )}
                </Button>
                <Button
                  disabled={isUpsertPending || !channelDraft || !draftIsDirty}
                  onClick={() => void handleSaveChannel({ channelId: channelDraft, type: config.type })}
                  type="button"
                >
                  {isUpsertPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving
                    </>
                  ) : config.status === 'not_configured' ? (
                    'Save Channel'
                  ) : (
                    'Update Channel'
                  )}
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
