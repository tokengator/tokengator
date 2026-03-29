import { createFileRoute, Link, Outlet, redirect } from '@tanstack/react-router'

import { getUser } from '@/functions/get-user'

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const session = await getUser()

    if (!session || session.user.role !== 'admin') {
      throw redirect({
        to: session ? '/profile' : '/login',
      })
    }

    return { session }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const links = [
    { label: 'Dashboard', to: '/admin/dashboard' },
    { label: 'Communities', to: '/admin/communities' },
  ] as const

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-muted-foreground">Platform administration tools.</p>
      </div>
      <nav className="flex flex-wrap gap-2 border-b pb-3 text-sm">
        {links.map(({ label, to }) => {
          return (
            <Link
              activeProps={{
                className: 'border-foreground text-foreground',
              }}
              className="text-muted-foreground hover:text-foreground border px-2 py-1 transition-colors"
              key={to}
              to={to}
            >
              {label}
            </Link>
          )
        })}
      </nav>
      <Outlet />
    </div>
  )
}
