import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { handleCopyText } from '@tokengator/ui/lib/handle-copy-text'

export interface HandleCopyProps {
  text: string
  timeout?: number
  toast: ReactNode
  toastFailed?: ReactNode
}

export function useHandleCopyText() {
  const [copied, setCopied] = useState(false)
  const copyTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null)

  function handleCopySuccess({ timeout = 2000, toast: successToast }: Pick<HandleCopyProps, 'timeout' | 'toast'>) {
    if (copyTimeoutRef.current !== null) {
      globalThis.clearTimeout(copyTimeoutRef.current)
    }

    copyTimeoutRef.current = globalThis.setTimeout(() => setCopied(false), timeout)
    setCopied(true)
    toast.success(successToast)
  }

  async function handleCopy({
    text,
    timeout = 2000,
    toast: successToast,
    toastFailed = 'Unable to copy text.',
  }: HandleCopyProps) {
    try {
      await handleCopyText(text)
      handleCopySuccess({
        timeout,
        toast: successToast,
      })
    } catch {
      toast.error(toastFailed)
    }
  }

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        globalThis.clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  return {
    copied,
    handleCopy,
  }
}
