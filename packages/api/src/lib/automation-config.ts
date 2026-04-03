import { env } from '@tokengator/env/api'

export const AUTOMATION_LOCK_TIMEOUT_MS = 15 * 60_000

export function getScheduledIndexIntervalMs() {
  return env.SCHEDULED_INDEX_INTERVAL_MINUTES * 60_000
}

export function getScheduledDiscordSyncIntervalMs() {
  return env.SCHEDULED_DISCORD_SYNC_INTERVAL_MINUTES * 60_000
}

export function getScheduledMembershipSyncIntervalMs() {
  return env.SCHEDULED_MEMBERSHIP_SYNC_INTERVAL_MINUTES * 60_000
}

export function getSchedulerPollMs() {
  return env.SCHEDULER_POLL_SECONDS * 1000
}

export function getStaleAfterMs(intervalMs: number) {
  return intervalMs + getSchedulerPollMs()
}

export function getStaleAfterMinutes(intervalMs: number) {
  return Math.ceil(getStaleAfterMs(intervalMs) / 60_000)
}
