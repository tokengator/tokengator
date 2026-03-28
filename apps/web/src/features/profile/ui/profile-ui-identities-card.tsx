import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

type ProfileIdentity = {
  accountId: string
  createdAt: number
  id: string
  providerId: string
}

interface ProfileUiIdentitiesCardProps {
  identities: ProfileIdentity[]
  isPending?: boolean
}

function formatConnectedDate(createdAt: number) {
  return new Date(createdAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatProviderLabel(providerId: string) {
  switch (providerId) {
    case 'discord':
      return 'Discord'
    case 'siws':
      return 'Solana'
    default:
      return providerId
  }
}

export function ProfileUiIdentitiesCard({ identities, isPending = false }: ProfileUiIdentitiesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Identities</CardTitle>
        <CardDescription>Connected social identities for your TokenGator account.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {isPending ? <p className="text-muted-foreground">Loading identities...</p> : null}
        {!isPending && identities.length === 0 ? (
          <p className="text-muted-foreground">No connected social identities.</p>
        ) : null}
        {!isPending
          ? identities.map((identity) => (
              <div className="grid gap-1 rounded-lg border p-3" key={identity.id}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{formatProviderLabel(identity.providerId)}</p>
                  <p className="text-muted-foreground text-xs">Connected {formatConnectedDate(identity.createdAt)}</p>
                </div>
                <p className="font-mono text-xs">{identity.accountId}</p>
              </div>
            ))
          : null}
      </CardContent>
    </Card>
  )
}
