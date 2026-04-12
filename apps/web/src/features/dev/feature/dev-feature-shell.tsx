import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { Tabs, TabsList, TabsTrigger } from '@tokengator/ui/components/tabs'

const devTabs = [
  {
    label: 'Shadcn',
    to: '/dev/shadcn',
    value: 'shadcn',
  },
  {
    label: 'UI',
    to: '/dev/ui',
    value: 'ui',
  },
] as const

function getCurrentTab(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  const lastSegment = segments.at(-1)
  const activeTab = devTabs.find((tab) => tab.value === lastSegment)

  return activeTab?.value ?? devTabs[0].value
}

export function DevFeatureShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const currentTab = getCurrentTab(location.pathname)

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Development</h1>
        <p className="text-muted-foreground">Internal development tools.</p>
      </div>

      <Tabs
        onValueChange={(value) => {
          const nextTab = devTabs.find((tab) => tab.value === value)

          if (!nextTab || nextTab.value === currentTab) {
            return
          }

          void navigate({
            to: nextTab.to,
          })
        }}
        value={currentTab}
      >
        <TabsList className="w-full justify-start">
          {devTabs.map((tab) => (
            <TabsTrigger key={tab.value} nativeButton={false} render={<Link to={tab.to} />} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {children}
    </div>
  )
}
