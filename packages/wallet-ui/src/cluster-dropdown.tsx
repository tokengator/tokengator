'use client'

import { useWalletUiCluster } from '@wallet-ui/react'
import { Button } from '@tokengator/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@tokengator/ui/components/dropdown-menu'
import { cn } from '@tokengator/ui/lib/utils'

export interface ClusterDropdownProps {
  className?: string
}

export function ClusterDropdown({ className }: ClusterDropdownProps) {
  const { cluster, clusters, setCluster } = useWalletUiCluster()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button className={cn('justify-start', className)} variant="outline" />}>
        <span className="truncate">{cluster.label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {clusters.map((availableCluster) => (
          <DropdownMenuItem key={availableCluster.id} onClick={() => setCluster(availableCluster.id)}>
            {availableCluster.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
