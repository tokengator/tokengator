import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/communities/$slug/collections/$address/')({
  component: RouteComponent,
})

function RouteComponent() {
  return null
}
