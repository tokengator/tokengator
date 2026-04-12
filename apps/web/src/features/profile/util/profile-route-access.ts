import type { AppSession } from '@/features/auth/data-access/get-app-auth-state'

export function canAccessProfileSettings(args: { session: AppSession | null; username: string }) {
  return args.session?.user.username === args.username
}

export function getProfileIndexRedirect(session: AppSession | null) {
  if (!session) {
    return {
      to: '/login' as const,
    }
  }

  if (!session.user.username) {
    return {
      to: '/onboard' as const,
    }
  }

  return {
    params: {
      username: session.user.username,
    },
    to: '/profile/$username' as const,
  }
}
