import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/assets/$assetGroupId/')({
  beforeLoad: async ({ params }) => {
    throw redirect({
      params,
      search: {
        limit: 50,
        offset: 0,
      },
      to: '/admin/assets/$assetGroupId/assets',
    })
  },
})
