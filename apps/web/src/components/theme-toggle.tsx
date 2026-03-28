import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@tokengator/ui/components/button'
import { Skeleton } from '@tokengator/ui/components/skeleton'

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <Skeleton className="size-7 rounded-none" />
  }

  const isDark = resolvedTheme !== 'light'
  const nextTheme = isDark ? 'light' : 'dark'
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <Button
      aria-label={label}
      aria-pressed={isDark}
      onClick={() => setTheme(nextTheme)}
      size="icon-sm"
      title={label}
      type="button"
      variant="ghost"
    >
      {isDark ? <Sun /> : <Moon />}
      <span className="sr-only">{label}</span>
    </Button>
  )
}
