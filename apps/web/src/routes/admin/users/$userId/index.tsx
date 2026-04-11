import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/users/$userId/')({
  beforeLoad: async ({ params }) => {
    throw redirect({
      params,
      to: '/admin/users/$userId/overview',
    })
  },
})
