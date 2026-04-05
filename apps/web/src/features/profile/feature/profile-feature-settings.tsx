import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

export function ProfileFeatureSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Profile settings are coming soon.</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        This tab is a placeholder for future profile settings.
      </CardContent>
    </Card>
  )
}
