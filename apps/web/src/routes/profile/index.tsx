import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/profile/')({
  beforeLoad: () => {
    throw redirect({
      to: '/profile/identities',
    })
  },
  component: RouteComponent,
})

function RouteComponent() {
  return null
}
