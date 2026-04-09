import { type Database } from '@tokengator/db'
import { env } from '@tokengator/env/api'
import { formatLogError, getAppLogger } from '@tokengator/logger'

import {
  listEnabledAssetGroupsDueForScheduledIndexing,
  runScheduledAssetGroupIndex,
} from './features/asset-group-index'
import {
  listOrganizationsDueForScheduledCommunityDiscordSync,
  listOrganizationsDueForScheduledCommunityMembershipSync,
  runScheduledCommunityRoleDiscordSync,
  runScheduledCommunityRoleSync,
} from './features/community-role-sync'
import { getSchedulerPollMs } from './lib/automation-config'

const logger = getAppLogger('api', 'scheduled-jobs')

export interface ScheduledJobsDependencies {
  listEnabledAssetGroupsDueForScheduledIndexing?: typeof listEnabledAssetGroupsDueForScheduledIndexing
  listOrganizationsDueForScheduledCommunityDiscordSync?: typeof listOrganizationsDueForScheduledCommunityDiscordSync
  listOrganizationsDueForScheduledCommunityMembershipSync?: typeof listOrganizationsDueForScheduledCommunityMembershipSync
  runScheduledAssetGroupIndex?: typeof runScheduledAssetGroupIndex
  runScheduledCommunityRoleDiscordSync?: typeof runScheduledCommunityRoleDiscordSync
  runScheduledCommunityRoleSync?: typeof runScheduledCommunityRoleSync
}

export type ScheduledAssetGroupIndexResult = {
  assetGroupId: string
  status: 'failed' | 'locked' | 'succeeded'
}

export type ScheduledJobsPassResult = {
  assetGroupResults: ScheduledAssetGroupIndexResult[]
  communityDiscordResults: Awaited<ReturnType<typeof runScheduledCommunityRoleDiscordSync>>[]
  communityMembershipResults: Awaited<ReturnType<typeof runScheduledCommunityRoleSync>>[]
  finishedAt: Date
  startedAt: Date
}

async function runScheduledAssetGroupIndexPass(input: {
  database?: Database
  dependencies?: ScheduledJobsDependencies
  now?: () => Date
}) {
  const listDue =
    input.dependencies?.listEnabledAssetGroupsDueForScheduledIndexing ?? listEnabledAssetGroupsDueForScheduledIndexing
  const runIndex = input.dependencies?.runScheduledAssetGroupIndex ?? runScheduledAssetGroupIndex
  const assetGroups = await listDue({
    database: input.database,
    now: input.now,
  })
  const results: ScheduledAssetGroupIndexResult[] = []

  for (const assetGroup of assetGroups) {
    try {
      const result = await runIndex({
        apiKey: env.HELIUS_API_KEY,
        assetGroup,
        database: input.database,
        heliusCluster: env.HELIUS_CLUSTER,
        now: input.now,
      })

      results.push({
        assetGroupId: assetGroup.id,
        status: result ? 'succeeded' : 'locked',
      })
    } catch (error) {
      logger.error('[scheduled-jobs:index] assetGroupId={assetGroupId} failed error={error}', {
        assetGroupId: assetGroup.id,
        error: formatLogError(error),
      })
      results.push({
        assetGroupId: assetGroup.id,
        status: 'failed',
      })
    }
  }

  return results
}

async function runScheduledCommunityMembershipPass(input: {
  database?: Database
  dependencies?: ScheduledJobsDependencies
  now?: () => Date
}) {
  const listDue =
    input.dependencies?.listOrganizationsDueForScheduledCommunityMembershipSync ??
    listOrganizationsDueForScheduledCommunityMembershipSync
  const runSync = input.dependencies?.runScheduledCommunityRoleSync ?? runScheduledCommunityRoleSync
  const organizationIds = await listDue({
    database: input.database,
    now: input.now,
  })
  const results: Awaited<ReturnType<typeof runScheduledCommunityRoleSync>>[] = []

  for (const organizationId of organizationIds) {
    const result = await runSync({
      database: input.database,
      now: input.now,
      organizationId,
    })

    if (result.status === 'failed') {
      logger.error('[scheduled-jobs:membership] organizationId={organizationId} failed error={error}', {
        error: result.errorMessage ?? 'unknown',
        organizationId,
      })
    }

    results.push(result)
  }

  return results
}

async function runScheduledCommunityDiscordPass(input: {
  database?: Database
  dependencies?: ScheduledJobsDependencies
  membershipResults: Awaited<ReturnType<typeof runScheduledCommunityRoleSync>>[]
  now?: () => Date
}) {
  const listDue =
    input.dependencies?.listOrganizationsDueForScheduledCommunityDiscordSync ??
    listOrganizationsDueForScheduledCommunityDiscordSync
  const runSync = input.dependencies?.runScheduledCommunityRoleDiscordSync ?? runScheduledCommunityRoleDiscordSync
  const membershipResultByOrganizationId = new Map(
    input.membershipResults.map((result) => [result.organizationId, result] as const),
  )
  const organizationIds = await listDue({
    database: input.database,
    now: input.now,
  })
  const results: Awaited<ReturnType<typeof runScheduledCommunityRoleDiscordSync>>[] = []

  for (const organizationId of organizationIds) {
    const membershipResult = membershipResultByOrganizationId.get(organizationId)
    const result = await runSync({
      database: input.database,
      now: input.now,
      organizationId,
      skipReason: membershipResult?.status === 'failed' ? 'membership_run_failed' : undefined,
    })

    if (result.status === 'failed') {
      logger.error('[scheduled-jobs:discord] organizationId={organizationId} failed error={error}', {
        error: result.errorMessage ?? 'unknown',
        organizationId,
      })
    }

    results.push(result)
  }

  return results
}

export async function runScheduledJobsPass(input?: {
  database?: Database
  dependencies?: ScheduledJobsDependencies
  now?: () => Date
}) {
  const startedAt = input?.now?.() ?? new Date()
  const assetGroupResults = await runScheduledAssetGroupIndexPass({
    database: input?.database,
    dependencies: input?.dependencies,
    now: input?.now,
  })
  const communityMembershipResults = await runScheduledCommunityMembershipPass({
    database: input?.database,
    dependencies: input?.dependencies,
    now: input?.now,
  })
  const communityDiscordResults = await runScheduledCommunityDiscordPass({
    database: input?.database,
    dependencies: input?.dependencies,
    membershipResults: communityMembershipResults,
    now: input?.now,
  })
  const finishedAt = input?.now?.() ?? new Date()

  logger.info('[scheduled-jobs] completed assetGroups={assetGroups} membership={membership} discord={discord}', {
    assetGroups: assetGroupResults.length,
    discord: communityDiscordResults.length,
    membership: communityMembershipResults.length,
  })

  return {
    assetGroupResults,
    communityDiscordResults,
    communityMembershipResults,
    finishedAt,
    startedAt,
  } satisfies ScheduledJobsPassResult
}

export async function runScheduledJobsLoop(input?: {
  database?: Database
  dependencies?: ScheduledJobsDependencies
  now?: () => Date
  signal?: AbortSignal
}) {
  const signal = input?.signal
  let stopLogged = false

  function logStop() {
    if (stopLogged) {
      return
    }

    stopLogged = true
    logger.info('[scheduled-jobs] stopping')
  }

  async function waitForNextPass() {
    if (!signal) {
      await Bun.sleep(getSchedulerPollMs())

      return true
    }

    if (signal.aborted) {
      return false
    }

    const abortSignal = signal

    return await new Promise<boolean>((resolve) => {
      let settled = false

      function finalize(shouldContinue: boolean) {
        if (settled) {
          return
        }

        settled = true
        abortSignal.removeEventListener('abort', onAbort)
        resolve(shouldContinue)
      }

      function onAbort() {
        finalize(false)
      }

      abortSignal.addEventListener('abort', onAbort, {
        once: true,
      })
      void Bun.sleep(getSchedulerPollMs()).then(() => finalize(true))
    })
  }

  if (signal?.aborted) {
    logStop()

    return
  }

  while (!signal?.aborted) {
    try {
      await runScheduledJobsPass({
        database: input?.database,
        dependencies: input?.dependencies,
        now: input?.now,
      })
    } catch (error) {
      logger.error('[scheduled-jobs] pass failed error={error}', {
        error: formatLogError(error),
      })
    }

    if (signal?.aborted) {
      logStop()

      break
    }

    if (!(await waitForNextPass())) {
      logStop()

      break
    }
  }
}
