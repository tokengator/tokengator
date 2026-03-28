import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/dashboard')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="rounded-md border p-4">
      <h2 className="text-lg font-medium">Dashboard</h2>
      <p className="text-muted-foreground">Admin dashboard placeholder. More admin pages can hang off this section.</p>
    </div>
  )
}
