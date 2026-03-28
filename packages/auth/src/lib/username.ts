export const MAX_USERNAME_LENGTH = 32
export const MIN_USERNAME_LENGTH = 2

const CONSECUTIVE_PERIOD_PATTERN = /\.\./
const USERNAME_PATTERN = /^[a-z0-9._]+$/

export function getDiscordUsername(input: string | null | undefined) {
  if (!input) {
    return null
  }

  const normalizedUsername = normalizeUsername(input.trim())

  return isValidUsername(normalizedUsername) ? normalizedUsername : null
}

export function normalizeUsername(input: string) {
  return input.toLowerCase()
}

export function isValidUsername(input: string) {
  const normalizedUsername = normalizeUsername(input)

  return (
    normalizedUsername.length >= MIN_USERNAME_LENGTH &&
    normalizedUsername.length <= MAX_USERNAME_LENGTH &&
    !CONSECUTIVE_PERIOD_PATTERN.test(normalizedUsername) &&
    USERNAME_PATTERN.test(normalizedUsername)
  )
}
