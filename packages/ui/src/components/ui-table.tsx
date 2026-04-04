import * as React from 'react'

import { cn } from '@tokengator/ui/lib/utils'

interface UiTableProps extends React.ComponentProps<'table'> {
  containerClassName?: string
}

function UiTable({ children, className, containerClassName, ...props }: UiTableProps) {
  return (
    <div className={cn('overflow-x-auto border', containerClassName)} data-slot="ui-table-container">
      <table className={cn('w-full border-collapse text-left text-sm', className)} data-slot="ui-table" {...props}>
        {children}
      </table>
    </div>
  )
}

function UiTableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return <td className={cn('border-b px-3 py-2', className)} data-slot="ui-table-cell" {...props} />
}

function UiTableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody className={cn(className)} data-slot="ui-table-body" {...props} />
}

function UiTableHead({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead className={cn('bg-muted/40', className)} data-slot="ui-table-head" {...props} />
}

function UiTableHeaderCell({ className, ...props }: React.ComponentProps<'th'>) {
  return <th className={cn('border-b px-3 py-2 font-medium', className)} data-slot="ui-table-header-cell" {...props} />
}

function UiTableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return <tr className={cn(className)} data-slot="ui-table-row" {...props} />
}

export { UiTable, UiTableBody, UiTableCell, UiTableHead, UiTableHeaderCell, UiTableRow }
