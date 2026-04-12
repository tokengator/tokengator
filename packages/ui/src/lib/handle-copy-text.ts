function copyWithExecCommand(text: string) {
  if (typeof globalThis === 'undefined' || !globalThis.document || !globalThis.document.body) {
    throw new Error('Unable to copy text.')
  }

  const { document } = globalThis
  const { body } = document
  const textarea = document.createElement('textarea')

  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.left = '-9999px'
  textarea.style.position = 'absolute'
  textarea.style.top = '0'

  let didAppend = false
  let didCopy = false

  try {
    body.appendChild(textarea)
    didAppend = true
    textarea.select()
    textarea.setSelectionRange(0, text.length)
    didCopy = Boolean(document.execCommand?.('copy'))
  } finally {
    if (didAppend) {
      body.removeChild(textarea)
    }
  }

  if (!didCopy) {
    throw new Error('Unable to copy text.')
  }
}

export async function handleCopyText(text: string) {
  if (!text) {
    throw new Error('Unable to copy text.')
  }

  if (typeof globalThis !== 'undefined' && globalThis.navigator?.clipboard?.writeText) {
    try {
      await globalThis.navigator.clipboard.writeText(text)
      return
    } catch {
      copyWithExecCommand(text)
      return
    }
  }

  copyWithExecCommand(text)
}
