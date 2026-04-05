import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/communities/$organizationId/')({
  beforeLoad: async ({ params }) => {
    throw redirect({
      params,
      to: '/admin/communities/$organizationId/overview',
    })
  },
})
