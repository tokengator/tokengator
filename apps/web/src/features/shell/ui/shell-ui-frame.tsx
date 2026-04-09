import type { ReactNode } from 'react'

const shellFrameStyle = {
  paddingTop: 'env(safe-area-inset-top)',
} as const

const shellUiFrameContentStyle = {
  paddingBottom: 'env(safe-area-inset-bottom)',
  paddingLeft: 'env(safe-area-inset-left)',
  paddingRight: 'env(safe-area-inset-right)',
} as const

interface ShellUiFrameProps {
  children: ReactNode
  header: ReactNode
}

export function ShellUiFrame({ children, header }: ShellUiFrameProps) {
  return (
    <div className="grid h-svh min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden" style={shellFrameStyle}>
      {header}
      <div className="min-h-0 min-w-0 overflow-x-hidden overflow-y-auto" style={shellUiFrameContentStyle}>
        {children}
      </div>
    </div>
  )
}
