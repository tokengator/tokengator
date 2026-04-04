import type { SolanaSignInInput, SolanaSignInOutput } from '@wallet-ui/react'
import { getBase58Decoder } from '@solana/kit'
import { createSIWSInput, type SIWSNonceResponse } from 'better-auth-solana/client'

import { authClient } from './auth-client'

type SIWSAction = 'link' | 'verify'

export async function handleSiwsAuth({
  action,
  address,
  refresh,
  signIn,
  statement,
}: {
  action: SIWSAction
  address: string
  refresh?: () => Promise<void>
  signIn: (input: SolanaSignInInput) => Promise<SolanaSignInOutput>
  statement: string
}) {
  const nonce = await fetchNonce({ address })
  const { message, signature } = await createAndSignMessage({
    address,
    nonce,
    signIn,
    statement,
  })

  const result =
    action === 'link'
      ? await linkMessage({
          address,
          message,
          signature,
        })
      : await verifyMessage({
          address,
          message,
          signature,
        })

  await refresh?.()

  return result
}

async function createAndSignMessage({
  address,
  nonce,
  signIn,
  statement,
}: {
  address: string
  nonce: SIWSNonceResponse
  signIn: (input: SolanaSignInInput) => Promise<SolanaSignInOutput>
  statement: string
}) {
  const input = createSIWSInput({
    address,
    challenge: nonce,
    statement,
  })
  const signed = await signIn(input)

  return {
    message: new TextDecoder().decode(signed.signedMessage),
    signature: getBase58Decoder().decode(signed.signature),
  }
}

async function fetchNonce({ address }: { address: string }): Promise<SIWSNonceResponse> {
  const { data, error } = await authClient.siws.nonce({
    walletAddress: address,
  })

  if (!data) {
    throw new Error(error?.message || 'Failed to fetch nonce')
  }

  return data
}

async function linkMessage({ address, message, signature }: { address: string; message: string; signature: string }) {
  const { data, error } = await authClient.siws.link({
    message,
    signature,
    walletAddress: address,
  })

  if (!data) {
    throw new Error(error?.message || 'Failed to link wallet')
  }

  return data
}

async function verifyMessage({ address, message, signature }: { address: string; message: string; signature: string }) {
  const { data, error } = await authClient.siws.verify({
    message,
    signature,
    walletAddress: address,
  })

  if (!data) {
    throw new Error(error?.message || 'Failed to verify signature')
  }

  return data
}
