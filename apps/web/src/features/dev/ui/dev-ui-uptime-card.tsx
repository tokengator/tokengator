import { Button } from '@tokengator/ui/components/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'
import { UiDebug } from '@tokengator/ui/components/ui-debug'

interface DevUiUptimeCardProps {
  data?: {
    uptime: number
  }
  errorMessage: string | null
  isFetching: boolean
  refresh: () => void
}

export function DevUiUptimeCard(props: DevUiUptimeCardProps) {
  const { data, errorMessage, isFetching, refresh } = props

  return (
    <Card>
      <CardHeader>
        <CardAction>
          <Button disabled={isFetching} onClick={refresh} variant="outline">
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </CardAction>
        <CardTitle>Uptime</CardTitle>
        <CardDescription>Calls the admin-only `dev.uptime` operation and renders the response payload.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {errorMessage ? (
          <div className="text-destructive text-sm">{errorMessage}</div>
        ) : (
          <>
            <div className="text-2xl font-semibold">{data ? `${data.uptime.toFixed(2)} seconds` : 'Loading...'}</div>
            {data ? <UiDebug className="bg-muted/50 rounded-md p-3" data={data} /> : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
