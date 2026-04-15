import { useState } from 'react'
import { Button } from '@tokengator/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { Input } from '@tokengator/ui/components/input'
import { UiDebug } from '@tokengator/ui/components/ui-debug'

interface DevUiEchoCardProps {
  data: unknown
  errorMessage: string | null
  isPending: boolean
  sendEcho: (text: string) => void
}

export function DevUiEchoCard(props: DevUiEchoCardProps) {
  const { data, errorMessage, isPending, sendEcho } = props
  const [text, setText] = useState('hello from /dev/api')
  const canSubmit = text.trim().length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Echo</CardTitle>
        <CardDescription>
          Sends input through the admin-only `dev.echo` operation and shows the returned payload.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()

            if (!canSubmit || isPending) {
              return
            }

            sendEcho(text)
          }}
        >
          <Input
            onChange={(event) => setText(event.target.value)}
            placeholder="Type something to echo back"
            value={text}
          />
          <div className="flex justify-end">
            <Button disabled={!canSubmit || isPending} type="submit">
              {isPending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </form>

        {errorMessage ? <div className="text-destructive text-sm">{errorMessage}</div> : null}
        {data ? (
          <UiDebug className="bg-muted/50 rounded-md p-3" data={data} />
        ) : (
          <div className="text-muted-foreground text-sm">Submit a value to test the request and response flow.</div>
        )}
      </CardContent>
    </Card>
  )
}
