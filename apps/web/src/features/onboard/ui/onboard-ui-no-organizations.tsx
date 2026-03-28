import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

export function OnboardUiNoOrganizations() {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Community access required</CardTitle>
          <CardDescription>You need to be invited to a community before you can use TokenGator.</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Ask an administrator to add you to a community, then reload this page.
        </CardContent>
      </Card>
    </div>
  )
}
