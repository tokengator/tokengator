import { Loader2 } from 'lucide-react'
import { type SubmitEvent, useEffect, useState } from 'react'
import { Button } from '@tokengator/ui/components/button'
import { Input } from '@tokengator/ui/components/input'

interface AdminCommunityDiscordConnectionUiFormProps {
  initialGuildId: string
  isPending: boolean
  onSubmit: (guildId: string) => Promise<boolean>
}

export function AdminCommunityDiscordConnectionUiForm(props: AdminCommunityDiscordConnectionUiFormProps) {
  const { initialGuildId, isPending, onSubmit } = props
  const [guildId, setGuildId] = useState(initialGuildId)

  useEffect(() => {
    setGuildId(initialGuildId)
  }, [initialGuildId])

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit(guildId)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-1.5">
        <label className="text-sm" htmlFor="organization-discord-guild-id">
          Server ID
        </label>
        <Input
          id="organization-discord-guild-id"
          inputMode="numeric"
          onChange={(event) => setGuildId(event.target.value)}
          placeholder="123456789012345678"
          required
          value={guildId}
        />
        <p className="text-muted-foreground text-xs">
          Copy the Discord server ID from Developer Mode, then save it here before inviting the bot.
        </p>
      </div>
      <div className="flex justify-end">
        <Button disabled={isPending || !guildId.trim()} type="submit">
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving
            </>
          ) : (
            'Save Server'
          )}
        </Button>
      </div>
    </form>
  )
}
