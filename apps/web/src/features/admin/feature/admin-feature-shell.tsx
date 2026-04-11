import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

type AdminLink =
  | {
      label: string
      search?: never
      to: '/admin/communities' | '/admin/dashboard' | '/admin/users'
    }
  | {
      label: string
      search?: {
        limit: number
        offset: number
      }
      to: '/admin/assets'
    }

const links = [
  {
    label: 'Dashboard',
    to: '/admin/dashboard',
  },
  {
    label: 'Assets',
    search: {
      limit: 25,
      offset: 0,
    },
    to: '/admin/assets',
  },
  {
    label: 'Communities',
    to: '/admin/communities',
  },
  {
    label: 'Users',
    to: '/admin/users',
  },
] satisfies AdminLink[]

export function AdminFeatureShell({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-muted-foreground">Platform administration tools.</p>
      </div>
      <nav className="flex flex-wrap gap-2 border-b pb-3 text-sm">
        {links.map((link) =>
          link.to === '/admin/assets' ? (
            <Link
              activeProps={{
                className: 'border-foreground text-foreground',
              }}
              className="text-muted-foreground hover:text-foreground border px-2 py-1 transition-colors"
              key={link.to}
              search={link.search ?? { limit: 25, offset: 0 }}
              to={link.to}
            >
              {link.label}
            </Link>
          ) : (
            <Link
              activeProps={{
                className: 'border-foreground text-foreground',
              }}
              className="text-muted-foreground hover:text-foreground border px-2 py-1 transition-colors"
              key={link.to}
              to={link.to}
            >
              {link.label}
            </Link>
          ),
        )}
      </nav>
      {children}
    </div>
  )
}
