import { useNavigate } from '@tanstack/react-router'
import type { AppSessionUser } from '@/features/auth/data-access/get-app-auth-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tokengator/ui/components/card'

import type { CliAuthDeviceClient } from '../data-access/cli-auth-device-client'
import { useCliAuthDeviceApprove } from '../data-access/use-cli-auth-device-approve'
import { useCliAuthDeviceDeny } from '../data-access/use-cli-auth-device-deny'
import type { CliAuthUserCodeVerification } from '../data-access/verify-cli-auth-user-code-fn'
import { CliAuthUiDeviceActions } from '../ui/cli-auth-ui-device-actions'
import { CliAuthUiDeviceDetails } from '../ui/cli-auth-ui-device-details'
import { CliAuthUiFinalState } from '../ui/cli-auth-ui-final-state'
import { CliAuthUiVerificationError } from '../ui/cli-auth-ui-verification-error'

function getUserDisplay(user: AppSessionUser) {
  return user.username ?? user.name ?? user.id
}

export function CliAuthFeatureDeviceRequest({
  authClient,
  user,
  userCode,
  userCodeVerification,
}: {
  authClient?: CliAuthDeviceClient
  user: AppSessionUser
  userCode: string
  userCodeVerification: CliAuthUserCodeVerification
}) {
  const navigate = useNavigate({ from: '/cli/authorize' })
  const approveMutation = useCliAuthDeviceApprove(authClient)
  const denyMutation = useCliAuthDeviceDeny(authClient)

  function tryDifferentCode() {
    void navigate({
      replace: true,
      search: {},
      to: '/cli/authorize',
    })
  }

  if (approveMutation.isSuccess) {
    return <CliAuthUiFinalState state="approved" />
  }

  if (denyMutation.isSuccess) {
    return <CliAuthUiFinalState state="denied" />
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Authorize Tokengator CLI</CardTitle>
          <CardDescription>Approve this request only if the code matches your terminal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <CliAuthUiDeviceDetails accountLabel={getUserDisplay(user)} userCode={userCode} />
          {userCodeVerification.error ? (
            <CliAuthUiVerificationError
              error={userCodeVerification.error}
              tryDifferentCode={userCodeVerification.state === 'invalid' ? tryDifferentCode : undefined}
            />
          ) : null}
          <CliAuthUiDeviceActions
            approveDevice={() => approveMutation.mutate({ userCode })}
            denyDevice={() => denyMutation.mutate({ userCode })}
            isDisabled={approveMutation.isPending || denyMutation.isPending || userCodeVerification.state !== 'ready'}
          />
        </CardContent>
      </Card>
    </div>
  )
}
