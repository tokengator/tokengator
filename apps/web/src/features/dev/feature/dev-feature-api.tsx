import { useState } from 'react'
import { Button } from '@tokengator/ui/components/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { Input } from '@tokengator/ui/components/input'
import { UiDebug } from '@tokengator/ui/components/ui-debug'

import { useDevEcho } from '../data-access/use-dev-echo'
import { useDevUptimeQuery } from '../data-access/use-dev-uptime-query'

export function DevFeatureApi() {
  const echo = useDevEcho()
  const uptimeQuery = useDevUptimeQuery()
  const [text, setText] = useState('hello from /dev/api')
  const canSubmit = text.trim().length > 0

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardAction>
            <Button disabled={uptimeQuery.isFetching} onClick={() => void uptimeQuery.refetch()} variant="outline">
              {uptimeQuery.isFetching ? 'Refreshing...' : 'Refresh'}
            </Button>
          </CardAction>
          <CardTitle>Uptime</CardTitle>
          <CardDescription>
            Calls the admin-only `dev.uptime` operation and renders the response payload.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {uptimeQuery.error ? (
            <div className="text-destructive text-sm">{uptimeQuery.error.message}</div>
          ) : (
            <>
              <div className="text-2xl font-semibold">
                {uptimeQuery.data ? `${uptimeQuery.data.uptime.toFixed(2)} seconds` : 'Loading...'}
              </div>
              {uptimeQuery.data ? <UiDebug className="bg-muted/50 rounded-md p-3" data={uptimeQuery.data} /> : null}
            </>
          )}
        </CardContent>
      </Card>

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

              if (!canSubmit || echo.isPending) {
                return
              }

              echo.mutate({
                text,
              })
            }}
          >
            <Input
              onChange={(event) => setText(event.target.value)}
              placeholder="Type something to echo back"
              value={text}
            />
            <div className="flex justify-end">
              <Button disabled={!canSubmit || echo.isPending} type="submit">
                {echo.isPending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </form>

          {echo.error ? <div className="text-destructive text-sm">{echo.error.message}</div> : null}
          {echo.data ? (
            <UiDebug className="bg-muted/50 rounded-md p-3" data={echo.data} />
          ) : (
            <div className="text-muted-foreground text-sm">Submit a value to test the request and response flow.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
