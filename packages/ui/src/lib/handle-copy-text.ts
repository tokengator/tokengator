export async function handleCopyText(text: string) {
  if (!text) {
    throw new Error('Unable to copy text.')
  }

  if (
    typeof globalThis === 'undefined' ||
    !globalThis.navigator ||
    !globalThis.navigator.clipboard ||
    !globalThis.navigator.clipboard.writeText
  ) {
    throw new Error('Unable to copy text.')
  }

  await globalThis.navigator.clipboard.writeText(text)
}
