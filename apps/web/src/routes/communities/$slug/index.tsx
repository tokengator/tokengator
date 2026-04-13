import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/communities/$slug/')({
  beforeLoad: async ({ params }) => {
    throw redirect({
      params: {
        slug: params.slug,
      },
      to: '/communities/$slug/overview',
    })
  },
  component: RouteComponent,
})

function RouteComponent() {
  return null
}
