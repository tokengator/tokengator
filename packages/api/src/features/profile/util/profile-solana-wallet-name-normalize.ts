export function profileSolanaWalletNameNormalize(name: string | null) {
  const trimmedName = name?.trim()

  return trimmedName ? trimmedName : null
}
