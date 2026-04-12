import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/dev/')({
  beforeLoad: async () => {
    throw redirect({
      to: '/dev/shadcn',
    })
  },
})
