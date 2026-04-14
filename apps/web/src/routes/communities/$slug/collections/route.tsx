import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/communities/$slug/collections')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
