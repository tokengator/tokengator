import { reconcileLocalUserState } from '@tokengator/auth'
import { formatLogError, getAppLogger } from '@tokengator/logger'

const logger = getAppLogger('api', 'profile-router')

export async function profileUserIdentitiesReconcileBestEffort(args: { requestHeaders?: Headers; userId: string }) {
  try {
    await reconcileLocalUserState(args)
  } catch (error) {
    logger.error('[profile-router] userId={userId} failed to refresh identity projection error={error}', {
      error: formatLogError(error),
      userId: args.userId,
    })
  }
}
