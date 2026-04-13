import { Card, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card.tsx'

export function ProfileUiPrivate() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Private Profile</CardTitle>
        <CardDescription>This user exists, but their profile details are private.</CardDescription>
      </CardHeader>
    </Card>
  )
}
